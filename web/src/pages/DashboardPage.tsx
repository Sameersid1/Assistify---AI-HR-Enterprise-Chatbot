import React, { useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import { motion } from "framer-motion"
import {
  CheckCircle2,
  XCircle,
  MessageCircle,
  Plus,
  ArrowRight,
  Sparkles,
  UserPlus,
  Terminal,
  Settings,
  CalendarDays,
  CalendarCheck,
  X,
} from "lucide-react"
import { useAuth } from "@/context/AuthContext"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { AddEmployeeModal, type EmployeeData } from "@/components/modals/AddEmployeeModal"
import { InviteStaffModal, type StaffInviteData } from "@/components/modals/InviteStaffModal"

// ==========================================
// 1. CIRCULAR PROGRESS RING (PROMINENT 70PX)
// ==========================================
interface ProgressRingProps {
  value: number
  total: number
  size?: number
  strokeWidth?: number
}

const CircularProgressRing: React.FC<ProgressRingProps> = ({
  value,
  total,
  size = 70,
  strokeWidth = 5.5,
}) => {
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const percentage = Math.min(Math.max((value / total) * 100, 0), 100)
  const offset = circumference - (percentage / 100) * circumference

  return (
    <div className="relative flex items-center justify-center shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="rotate-[-90deg]">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="transparent"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          className="text-zinc-100 dark:text-zinc-800"
        />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="transparent"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          strokeLinecap="round"
          className="text-indigo-600 dark:text-indigo-500"
        />
      </svg>
      <span className="absolute text-2xl font-extrabold tabular-nums text-zinc-900 dark:text-zinc-50 leading-none">
        {value}
      </span>
    </div>
  )
}

// ==========================================
// 2. ROOT DASHBOARD (ROLE-GATED)
// ==========================================
export const DashboardPage: React.FC = () => {
  const { user } = useAuth()
  const role = user?.role || "employee"

  if (role === "admin") {
    return <AdminDashboardView />
  }
  if (role === "hr") {
    return <HRWorkQueueDashboardView />
  }
  return <EmployeeDashboardView />
}

// =========================================================================
// 3. EMPLOYEE DASHBOARD (Large Cards, Crisp Borders, No Clipped Edges)
// =========================================================================
interface EmployeeRequest {
  id: string
  type: string
  dates: string
  days: number
  status: "approved" | "pending" | "rejected"
}

const INITIAL_EMPLOYEE_REQUESTS: EmployeeRequest[] = [
  { id: "REQ-01", type: "Casual Leave", dates: "14 Aug – 15 Aug 2026", days: 2, status: "pending" },
  { id: "REQ-02", type: "Earned Leave", dates: "01 Jul – 04 Jul 2026", days: 4, status: "approved" },
  { id: "REQ-03", type: "Sick Leave", dates: "18 Jun 2026", days: 1, status: "approved" },
  { id: "REQ-04", type: "WFH Exception", dates: "10 Apr – 11 Apr 2026", days: 2, status: "approved" },
]

const UPCOMING_HOLIDAYS = [
  { date: "15 Aug 2026", name: "Independence Day", day: "Saturday" },
  { date: "27 Aug 2026", name: "Ganesh Chaturthi", day: "Thursday" },
  { date: "02 Oct 2026", name: "Gandhi Jayanti", day: "Friday" },
]

const EmployeeDashboardView: React.FC = () => {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [requests, setRequests] = useState<EmployeeRequest[]>(INITIAL_EMPLOYEE_REQUESTS)

  const getStatusBadge = (status: "approved" | "pending" | "rejected") => {
    switch (status) {
      case "approved":
        return <Badge variant="active" className="text-xs py-0.5 px-2.5 font-semibold">Approved</Badge>
      case "pending":
        return <Badge variant="pending" className="text-xs py-0.5 px-2.5 font-semibold">Pending</Badge>
      case "rejected":
        return <Badge variant="error" className="text-xs py-0.5 px-2.5 font-semibold">Rejected</Badge>
    }
  }

  return (
    <div className="space-y-5 font-sans w-full">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-200/90 dark:border-zinc-800/90 pb-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-50">
            Good morning, {user?.name?.split(" ")[0] || "Arjun"}
          </h1>
          <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400 mt-0.5">
            {user?.company} · Employee Self-Service
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm font-semibold text-zinc-600 dark:text-zinc-400 tabular-nums hidden sm:inline">
            Thursday, 6 August 2026
          </span>
          <Link to="/app/apply-leave">
            <Button
              size="sm"
              className="bg-indigo-600 hover:bg-indigo-700 text-white h-8.5 text-xs font-bold gap-1.5 px-3.5 shadow-2xs"
            >
              <Plus className="h-4 w-4" />
              <span>Apply for Leave</span>
            </Button>
          </Link>
        </div>
      </div>

      {/* Section 1: Three Large Balance Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <Link to="/app/apply-leave" className="block transition-transform hover:-translate-y-0.5">
          <div className="rounded-xl border border-zinc-200/90 bg-white dark:border-zinc-800/90 dark:bg-zinc-900 p-5 flex items-center justify-between shadow-xs hover:border-indigo-500 transition-colors">
            <div className="space-y-1.5 min-w-0">
              <p className="text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                Casual Leave
              </p>
              <p className="text-sm text-zinc-500 dark:text-zinc-400">of 12 total</p>
              <p className="text-sm font-bold text-zinc-800 dark:text-zinc-200">4 used this year</p>
            </div>
            <CircularProgressRing value={8} total={12} size={70} />
          </div>
        </Link>

        <Link to="/app/apply-leave" className="block transition-transform hover:-translate-y-0.5">
          <div className="rounded-xl border border-zinc-200/90 bg-white dark:border-zinc-800/90 dark:bg-zinc-900 p-5 flex items-center justify-between shadow-xs hover:border-amber-500 transition-colors">
            <div className="space-y-1.5 min-w-0">
              <p className="text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                Sick Leave
              </p>
              <p className="text-sm text-zinc-500 dark:text-zinc-400">of 8 total</p>
              <p className="text-sm font-bold text-zinc-800 dark:text-zinc-200">3 used this year</p>
            </div>
            <CircularProgressRing value={5} total={8} size={70} />
          </div>
        </Link>

        <Link to="/app/apply-leave" className="block transition-transform hover:-translate-y-0.5">
          <div className="rounded-xl border border-zinc-200/90 bg-white dark:border-zinc-800/90 dark:bg-zinc-900 p-5 flex items-center justify-between shadow-xs hover:border-emerald-500 transition-colors">
            <div className="space-y-1.5 min-w-0">
              <p className="text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                Earned Leave
              </p>
              <p className="text-sm text-zinc-500 dark:text-zinc-400">of 18 total</p>
              <p className="text-sm font-bold text-zinc-800 dark:text-zinc-200">4 used this year</p>
            </div>
            <CircularProgressRing value={14} total={18} size={70} />
          </div>
        </Link>
      </div>

      {/* Section 2: Two Columns */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left (8/12): Recent Requests */}
        <div className="lg:col-span-8 rounded-xl border border-zinc-200/90 bg-white dark:border-zinc-800/90 dark:bg-zinc-900 p-5 shadow-xs space-y-4 min-w-0">
          <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800/80 pb-3">
            <h2 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
              Recent requests
            </h2>
            <Link to="/app/apply-leave">
              <Button
                size="sm"
                className="bg-indigo-600 hover:bg-indigo-700 text-white h-8 text-xs font-semibold gap-1.5 px-3.5 shadow-2xs"
              >
                <Plus className="h-4 w-4" />
                <span>New request</span>
              </Button>
            </Link>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-zinc-100 dark:border-zinc-800 text-xs uppercase font-bold text-zinc-400">
                  <th className="py-2.5 px-3">Type</th>
                  <th className="py-2.5 px-3">Dates</th>
                  <th className="py-2.5 px-3">Days</th>
                  <th className="py-2.5 px-3 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-50 dark:divide-zinc-800/50">
                {requests.slice(0, 4).map((req) => (
                  <tr key={req.id} className="h-11.5 hover:bg-zinc-50/50 dark:hover:bg-zinc-800/30">
                    <td className="py-2 px-3 font-semibold text-zinc-900 dark:text-zinc-100 whitespace-nowrap">
                      {req.type}
                    </td>
                    <td className="py-2 px-3 text-zinc-700 dark:text-zinc-300 tabular-nums whitespace-nowrap">
                      {req.dates}
                    </td>
                    <td className="py-2 px-3 text-zinc-600 dark:text-zinc-400 tabular-nums font-medium whitespace-nowrap">
                      {req.days} {req.days === 1 ? "day" : "days"}
                    </td>
                    <td className="py-2 px-3 text-right whitespace-nowrap">
                      {getStatusBadge(req.status)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right (4/12): Holidays + Attendance */}
        <div className="lg:col-span-4 space-y-5 min-w-0">
          <div className="rounded-xl border border-zinc-200/90 bg-white dark:border-zinc-800/90 dark:bg-zinc-900 p-5 shadow-xs space-y-3">
            <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800/80 pb-2.5">
              <span className="text-xs font-bold uppercase tracking-wider text-zinc-600 dark:text-zinc-400 flex items-center gap-2">
                <CalendarDays className="h-4 w-4 text-indigo-600" />
                Upcoming Holidays
              </span>
              <span className="text-xs font-semibold text-zinc-400">Q3 2026</span>
            </div>
            <div className="space-y-2 text-sm">
              {UPCOMING_HOLIDAYS.map((h, i) => (
                <div key={i} className="flex items-center justify-between py-0.5 gap-2">
                  <span className="font-semibold text-zinc-800 dark:text-zinc-200 truncate">{h.name}</span>
                  <span className="text-zinc-500 tabular-nums font-medium text-xs shrink-0">{h.date}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-xl border border-zinc-200/90 bg-white dark:border-zinc-800/90 dark:bg-zinc-900 p-5 shadow-xs flex items-center justify-between">
            <div className="min-w-0 pr-3">
              <span className="text-xs font-bold uppercase tracking-wider text-zinc-600 dark:text-zinc-400 flex items-center gap-2">
                <CalendarCheck className="h-4 w-4 text-emerald-600" />
                Attendance
              </span>
              <p className="text-sm font-medium text-zinc-500 mt-1 truncate">22 of 23 days present</p>
            </div>
            <p className="text-3xl font-black tabular-nums text-zinc-900 dark:text-zinc-50 shrink-0">94%</p>
          </div>
        </div>
      </div>

      {/* Section 3: Assistant Banner */}
      <div className="rounded-xl border border-indigo-200/80 dark:border-indigo-900/60 bg-indigo-50/80 dark:bg-indigo-950/40 p-4.5 shadow-xs flex flex-wrap sm:flex-nowrap items-center justify-between gap-4">
        <div className="flex items-center gap-3.5 min-w-0">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600 text-white shrink-0 shadow-xs">
            <MessageCircle className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
              Ask Assistify anything
            </p>
            <p className="text-sm text-zinc-600 dark:text-zinc-400 truncate">
              Leave policy, holidays, reimbursements — get instant answers 24/7
            </p>
          </div>
        </div>
        <Link to="/app/chat" className="shrink-0">
          <Button size="sm" className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold h-8.5 px-4 rounded-lg shadow-xs">
            <span>Open chat</span>
            <ArrowRight className="ml-1.5 h-4 w-4" />
          </Button>
        </Link>
      </div>
    </div>
  )
}

// =========================================================================
// 4. HR WORK QUEUE DASHBOARD (With Add Employee Integration)
// =========================================================================
interface HRLeaveRequest {
  id: string
  name: string
  dept: string
  initials: string
  type: string
  dates: string
  days: number
  balanceAfter: string
  status?: "pending" | "approved" | "rejected"
}

const INITIAL_HR_REQUESTS: HRLeaveRequest[] = [
  { id: "LR-101", name: "Rohan Patel", dept: "Frontend Engineering", initials: "RP", type: "Casual Leave", dates: "12 Aug – 14 Aug", days: 3, balanceAfter: "5 of 12" },
  { id: "LR-102", name: "Aditi Sharma", dept: "Product Design", initials: "AS", type: "Privilege Leave", dates: "18 Aug – 21 Aug", days: 4, balanceAfter: "8 of 15" },
  { id: "LR-103", name: "Kavita Krishnan", dept: "Backend Platform", initials: "KK", type: "Sick Leave", dates: "07 Aug – 08 Aug", days: 2, balanceAfter: "1 of 6" },
  { id: "LR-104", name: "Siddharth Verma", dept: "QA & Automation", initials: "SV", type: "Casual Leave", dates: "14 Aug – 15 Aug", days: 2, balanceAfter: "7 of 12" },
]

const HRWorkQueueDashboardView: React.FC = () => {
  const { user } = useAuth()
  const [requests, setRequests] = useState<HRLeaveRequest[]>(INITIAL_HR_REQUESTS)
  const [isAddEmployeeOpen, setIsAddEmployeeOpen] = useState(false)
  const [newJoinerCount, setNewJoinerCount] = useState(3)

  const handleAction = (id: string, status: "approved" | "rejected") => {
    setRequests((prev) => prev.map((r) => (r.id === id ? { ...r, status } : r)))
  }

  const handleAddEmployee = (emp: EmployeeData) => {
    setNewJoinerCount((prev) => prev + 1)
  }

  return (
    <div className="space-y-5 font-sans w-full">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-200/90 dark:border-zinc-800/90 pb-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-50">
            7 requests need your attention
          </h1>
          <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400 mt-0.5">
            {user?.company} · People Operations
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            size="sm"
            onClick={() => setIsAddEmployeeOpen(true)}
            className="bg-indigo-600 hover:bg-indigo-700 text-white h-8.5 text-xs font-bold gap-1.5 px-4 shadow-sm ring-1 ring-indigo-500/50"
          >
            <UserPlus className="h-4 w-4" />
            <span>+ Add Employee</span>
          </Button>

          <Link to="/app/leave-approvals">
            <Button variant="ghost" size="sm" className="text-sm font-semibold h-8.5 text-zinc-700 hover:text-zinc-900 dark:text-zinc-300">
              <span>View all</span>
              <ArrowRight className="ml-1.5 h-4 w-4" />
            </Button>
          </Link>
        </div>
      </div>

      {/* Section 1: Thin Metric Strip */}
      <div className="rounded-xl border border-zinc-200/90 bg-white dark:border-zinc-800/90 dark:bg-zinc-900 shadow-xs overflow-hidden">
        <div className="grid grid-cols-2 sm:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-zinc-100 dark:divide-zinc-800 text-center sm:text-left">
          <div className="py-3.5 px-5">
            <p className="text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">Pending Approvals</p>
            <p className="text-3xl font-black tabular-nums text-amber-600 dark:text-amber-400 mt-0.5 leading-tight">7</p>
          </div>
          <div className="py-3.5 px-5">
            <p className="text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">Open Tickets</p>
            <p className="text-3xl font-black tabular-nums text-zinc-900 dark:text-zinc-100 mt-0.5 leading-tight">12</p>
          </div>
          <div className="py-3.5 px-5">
            <p className="text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">On Leave Today</p>
            <p className="text-3xl font-black tabular-nums text-zinc-900 dark:text-zinc-100 mt-0.5 leading-tight">4</p>
          </div>
          <div className="py-3.5 px-5 flex items-center justify-between">
            <div className="text-left">
              <p className="text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">New Joiners</p>
              <p className="text-3xl font-black tabular-nums text-indigo-600 dark:text-indigo-400 mt-0.5 leading-tight">{newJoinerCount}</p>
            </div>
            <Button
              size="sm"
              onClick={() => setIsAddEmployeeOpen(true)}
              variant="outline"
              className="h-7 px-2 text-xs font-semibold border-indigo-200 dark:border-indigo-800 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/50"
            >
              + Add
            </Button>
          </div>
        </div>
      </div>

      {/* Section 2: Pending Approvals Table */}
      <div className="rounded-xl border border-zinc-200/90 bg-white dark:border-zinc-800/90 dark:bg-zinc-900 shadow-xs overflow-hidden">
        <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 px-5 py-3 bg-zinc-50/50 dark:bg-zinc-900/50">
          <div className="flex items-center gap-2.5">
            <h2 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
              Pending leave approvals
            </h2>
            <Badge variant="pending" className="text-xs py-0.5 px-2 font-mono font-bold">4 items</Badge>
          </div>
          <div className="flex items-center gap-3">
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setIsAddEmployeeOpen(true)}
              className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline h-7 px-2"
            >
              + Add Employee
            </Button>
            <span className="text-xs font-medium text-zinc-400">Priority queue</span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm border-collapse">
            <thead>
              <tr className="border-b border-zinc-100 dark:border-zinc-800 text-xs uppercase font-bold text-zinc-400 bg-zinc-50/40 dark:bg-zinc-900/40">
                <th className="py-2.5 px-5">Employee</th>
                <th className="py-2.5 px-3">Type</th>
                <th className="py-2.5 px-3">Dates</th>
                <th className="py-2.5 px-3">Balance</th>
                <th className="py-2.5 px-5 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/60">
              {requests.map((req) => (
                <tr key={req.id} className="h-12.5 hover:bg-zinc-50/50 dark:hover:bg-zinc-800/30 transition-colors">
                  <td className="py-2 px-5">
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-zinc-100 dark:bg-zinc-800 text-xs font-bold text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700">
                        {req.initials}
                      </div>
                      <div className="min-w-0">
                        <p className="font-bold text-sm text-zinc-900 dark:text-zinc-100 truncate">{req.name}</p>
                        <p className="text-xs text-zinc-500 dark:text-zinc-400 truncate">{req.dept}</p>
                      </div>
                    </div>
                  </td>
                  <td className="py-2 px-3 whitespace-nowrap">
                    <Badge variant="outline" className="text-xs py-0.5 px-2.5 font-medium">{req.type}</Badge>
                  </td>
                  <td className="py-2 px-3 text-zinc-800 dark:text-zinc-200 text-sm tabular-nums font-semibold whitespace-nowrap">
                    {req.dates} <span className="text-zinc-400 font-normal">({req.days}d)</span>
                  </td>
                  <td className="py-2 px-3 text-sm tabular-nums text-zinc-700 dark:text-zinc-300 font-medium whitespace-nowrap">
                    {req.balanceAfter}
                  </td>
                  <td className="py-2 px-5 text-right whitespace-nowrap">
                    {req.status === "approved" ? (
                      <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-600">
                        <CheckCircle2 className="h-4 w-4" /> Approved
                      </span>
                    ) : req.status === "rejected" ? (
                      <span className="inline-flex items-center gap-1.5 text-xs font-bold text-rose-600">
                        <XCircle className="h-4 w-4" /> Rejected
                      </span>
                    ) : (
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleAction(req.id, "approved")}
                          className="h-7 px-3 text-xs font-bold border-emerald-300 text-emerald-600 hover:bg-emerald-50"
                        >
                          Approve
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleAction(req.id, "rejected")}
                          className="h-7 px-2.5 text-xs font-bold text-rose-600 hover:bg-rose-50"
                        >
                          Reject
                        </Button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Section 3: Two Columns (Activity & Assistant) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="rounded-xl border border-zinc-200/90 bg-white dark:border-zinc-800/90 dark:bg-zinc-900 p-5 space-y-3 shadow-xs min-w-0">
          <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800/80 pb-2.5">
            <span className="text-xs font-bold uppercase tracking-wider text-zinc-600 dark:text-zinc-400">Recent Activity</span>
            <span className="text-xs font-semibold text-zinc-400">Live feed</span>
          </div>
          <div className="space-y-2.5 text-sm">
            <div className="flex items-center justify-between gap-2">
              <span className="text-zinc-800 dark:text-zinc-200 truncate font-medium">Ananya Sharma applied for Sick Leave (1 day)</span>
              <span className="text-zinc-400 shrink-0 text-xs">10m ago</span>
            </div>
            <div className="flex items-center justify-between gap-2">
              <span className="text-zinc-800 dark:text-zinc-200 truncate font-medium">Devin Vance approved Travel Claim ($320)</span>
              <span className="text-zinc-400 shrink-0 text-xs">45m ago</span>
            </div>
            <div className="flex items-center justify-between gap-2">
              <span className="text-zinc-800 dark:text-zinc-200 truncate font-medium">Siddharth Verma submitted Medical Claim #902</span>
              <span className="text-zinc-400 shrink-0 text-xs">2h ago</span>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-zinc-200/90 bg-white dark:border-zinc-800/90 dark:bg-zinc-900 p-5 shadow-xs flex flex-col justify-between min-w-0">
          <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800/80 pb-2.5">
            <span className="text-xs font-bold uppercase tracking-wider text-zinc-600 dark:text-zinc-400 flex items-center gap-1.5">
              <Sparkles className="h-4 w-4 text-indigo-600" />
              Assistant Performance
            </span>
            <Badge variant="active" className="text-xs py-0.5 px-2 font-semibold">24/7 Active</Badge>
          </div>
          <div className="grid grid-cols-3 divide-x divide-zinc-100 dark:divide-zinc-800 text-center pt-3">
            <div>
              <p className="text-xs font-bold uppercase text-zinc-500">Deflection</p>
              <p className="text-3xl font-black text-indigo-600 tabular-nums mt-0.5">68%</p>
            </div>
            <div>
              <p className="text-xs font-bold uppercase text-zinc-500">Queries</p>
              <p className="text-3xl font-black text-zinc-900 dark:text-zinc-100 tabular-nums mt-0.5">214</p>
            </div>
            <div>
              <p className="text-xs font-bold uppercase text-zinc-500">Tickets</p>
              <p className="text-3xl font-black text-zinc-900 dark:text-zinc-100 tabular-nums mt-0.5">34</p>
            </div>
          </div>
        </div>
      </div>

      {/* Add Employee Modal */}
      <AddEmployeeModal
        isOpen={isAddEmployeeOpen}
        onClose={() => setIsAddEmployeeOpen(false)}
        onAddEmployee={handleAddEmployee}
      />
    </div>
  )
}

// =========================================================================
// 5. ADMIN DASHBOARD (With Invite Staff Integration)
// =========================================================================
interface PendingInvite {
  id: string
  email: string
  role: string
  expiresIn: string
}

const INITIAL_INVITES: PendingInvite[] = [
  { id: "inv-1", email: "kavya.nair@nexora.com", role: "Employee", expiresIn: "41h" },
  { id: "inv-2", email: "rahul.d@nexora.com", role: "IT Support", expiresIn: "18h" },
  { id: "inv-3", email: "sneha.iyer@nexora.com", role: "HR", expiresIn: "64h" },
]

const AUDIT_LOGS = [
  { time: "14:32:07", actor: "priya@nexora.com", action: "USER_INVITED", target: "rahul@nexora.com", isAI: false },
  { time: "14:28:41", actor: "system", action: "AI_TICKET_CREATED", target: "#HR-0231", isAI: true },
  { time: "13:55:12", actor: "priya@nexora.com", action: "LEAVE_APPROVED", target: "req_8842", isAI: false },
  { time: "09:15:00", actor: "system", action: "BACKUP_COMPLETED", target: "snapshot_20260806", isAI: true },
]

const AdminDashboardView: React.FC = () => {
  const { user } = useAuth()
  const [invites, setInvites] = useState<PendingInvite[]>(INITIAL_INVITES)
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false)
  const [resentId, setResentId] = useState<string | null>(null)

  const handleResend = (id: string) => {
    setResentId(id)
    setTimeout(() => setResentId(null), 2000)
  }

  const handleInviteStaff = (staff: StaffInviteData) => {
    const newInv: PendingInvite = {
      id: staff.id,
      email: staff.email,
      role: staff.role.toUpperCase(),
      expiresIn: staff.expiresIn,
    }
    setInvites([newInv, ...invites])
  }

  return (
    <div className="space-y-5 font-sans w-full">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-200/90 dark:border-zinc-800/90 pb-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-50">
            System overview
          </h1>
          <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400 mt-0.5">
            {user?.company} · Administration
          </p>
        </div>
        <Button
          onClick={() => setIsInviteModalOpen(true)}
          className="bg-indigo-600 hover:bg-indigo-700 text-white h-8 text-xs font-bold gap-1.5 px-3.5 shadow-2xs"
        >
          <UserPlus className="h-4 w-4" />
          <span>Invite HR / Staff</span>
        </Button>
      </div>

      {/* Section 1: Health Strip */}
      <div className="flex flex-wrap items-center gap-3 text-sm">
        <div className="inline-flex items-center gap-2 rounded-full border border-zinc-200/90 dark:border-zinc-800/90 bg-white dark:bg-zinc-900 px-3.5 py-1.5 shadow-2xs">
          <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
          <span className="text-zinc-900 dark:text-zinc-100 font-bold text-xs">API healthy</span>
        </div>
        <div className="inline-flex items-center gap-2 rounded-full border border-zinc-200/90 dark:border-zinc-800/90 bg-white dark:bg-zinc-900 px-3.5 py-1.5 shadow-2xs">
          <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
          <span className="text-zinc-900 dark:text-zinc-100 font-bold text-xs">Database connected</span>
        </div>
        <div className="inline-flex items-center gap-2 rounded-full border border-zinc-200/90 dark:border-zinc-800/90 bg-white dark:bg-zinc-900 px-3.5 py-1.5 shadow-2xs">
          <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
          <span className="text-zinc-900 dark:text-zinc-100 font-bold text-xs">48 active users</span>
        </div>
        <div className="inline-flex items-center gap-2 rounded-full border border-zinc-200/90 dark:border-zinc-800/90 bg-white dark:bg-zinc-900 px-3.5 py-1.5 shadow-2xs">
          <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
          <span className="text-zinc-900 dark:text-zinc-100 font-bold text-xs">Last backup 2h ago</span>
        </div>
      </div>

      {/* Section 2: Two Columns (Roles + Pending Invitations) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Users by role */}
        <div className="rounded-xl border border-zinc-200/90 bg-white dark:border-zinc-800/90 dark:bg-zinc-900 p-5 shadow-xs space-y-3.5 min-w-0">
          <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800/80 pb-2.5">
            <h2 className="text-base font-bold text-zinc-900 dark:text-zinc-100">Users by role</h2>
            <span className="text-xs text-zinc-400 font-mono font-bold">48 Total</span>
          </div>
          <div className="h-3.5 w-full rounded-full bg-zinc-100 dark:bg-zinc-800 overflow-hidden flex shadow-inner">
            <div style={{ width: "87.5%" }} className="bg-indigo-600 h-full" />
            <div style={{ width: "6.25%" }} className="bg-amber-500 h-full" />
            <div style={{ width: "4.17%" }} className="bg-sky-500 h-full" />
            <div style={{ width: "2.08%" }} className="bg-zinc-800 dark:bg-zinc-300 h-full" />
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs pt-1">
            <div className="flex items-center gap-2">
              <span className="h-3 w-3 rounded-xs bg-indigo-600" />
              <span>Employee: <strong>42</strong> (87%)</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="h-3 w-3 rounded-xs bg-amber-500" />
              <span>HR: <strong>3</strong> (6%)</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="h-3 w-3 rounded-xs bg-sky-500" />
              <span>IT: <strong>2</strong> (4%)</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="h-3 w-3 rounded-xs bg-zinc-700" />
              <span>Admin: <strong>1</strong> (2%)</span>
            </div>
          </div>
        </div>

        {/* Pending invitations */}
        <div className="rounded-xl border border-zinc-200/90 bg-white dark:border-zinc-800/90 dark:bg-zinc-900 p-5 shadow-xs space-y-3 min-w-0">
          <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800/80 pb-2.5">
            <h2 className="text-base font-bold text-zinc-900 dark:text-zinc-100">Pending invitations</h2>
            <Badge variant="pending" className="text-xs py-0.5 px-2 font-mono font-bold">{invites.length} pending</Badge>
          </div>
          <div className="space-y-2.5">
            {invites.slice(0, 3).map((inv) => (
              <div key={inv.id} className="flex items-center justify-between text-sm gap-2">
                <span className="font-semibold text-zinc-800 dark:text-zinc-200 truncate">{inv.email}</span>
                <div className="flex items-center gap-2.5 shrink-0">
                  <span className="text-xs text-amber-600 dark:text-amber-400 font-mono font-semibold">Exp in {inv.expiresIn}</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleResend(inv.id)}
                    className="h-6.5 px-2.5 text-xs text-zinc-600 hover:text-indigo-600 font-bold"
                  >
                    {resentId === inv.id ? "Sent!" : "Resend"}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Section 3: Two Columns (Audit Log + Company Config) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Audit Log Stream (8/12) */}
        <div className="lg:col-span-8 rounded-xl border border-zinc-200/90 bg-white dark:border-zinc-800/90 dark:bg-zinc-900 p-5 shadow-xs space-y-3 min-w-0">
          <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800/80 pb-2.5">
            <div className="flex items-center gap-2">
              <Terminal className="h-4.5 w-4.5 text-zinc-500" />
              <h2 className="text-base font-bold text-zinc-900 dark:text-zinc-100">Audit log stream</h2>
            </div>
            <span className="text-xs font-mono text-zinc-400 font-semibold">SOC-2 Synced</span>
          </div>

          <div className="rounded-xl border border-zinc-200/80 dark:border-zinc-800 bg-zinc-950 text-zinc-100 font-mono text-xs md:text-sm divide-y divide-zinc-800/60 shadow-inner overflow-hidden">
            {AUDIT_LOGS.map((log, i) => (
              <div key={i} className="flex items-center justify-between px-4 py-2.5 hover:bg-zinc-900/60 gap-3">
                <div className="flex items-center gap-3.5 truncate min-w-0">
                  <span className="text-zinc-400 text-xs shrink-0">{log.time}</span>
                  <span className="text-indigo-400 shrink-0 font-semibold">{log.actor}</span>
                  <div className="flex items-center gap-1.5 shrink-0">
                    {log.isAI && <Sparkles className="h-3.5 w-3.5 text-purple-400" />}
                    <span className={`font-bold ${log.isAI ? "text-purple-300" : "text-zinc-200"}`}>{log.action}</span>
                  </div>
                  <span className="text-zinc-400 text-xs truncate">{log.target}</span>
                </div>
                <span className="text-xs text-zinc-400 shrink-0 hidden sm:inline font-semibold">200 OK</span>
              </div>
            ))}
          </div>
        </div>

        {/* Company Configuration (4/12) */}
        <div className="lg:col-span-4 rounded-xl border border-zinc-200/90 bg-white dark:border-zinc-800/90 dark:bg-zinc-900 p-5 shadow-xs space-y-3 min-w-0">
          <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800/80 pb-2.5">
            <div className="flex items-center gap-2">
              <Settings className="h-4.5 w-4.5 text-zinc-500" />
              <h2 className="text-base font-bold text-zinc-900 dark:text-zinc-100">Org Policy</h2>
            </div>
            <span className="text-xs text-zinc-400 font-semibold">nexora.com</span>
          </div>

          <div className="space-y-2 text-sm">
            <div className="flex items-center justify-between py-1 text-sm">
              <span className="text-zinc-500">Annual leave</span>
              <span className="font-bold text-zinc-900 dark:text-zinc-100">18 days</span>
            </div>
            <div className="flex items-center justify-between py-1 text-sm">
              <span className="text-zinc-500">Casual leave</span>
              <span className="font-bold text-zinc-900 dark:text-zinc-100">12 days</span>
            </div>
            <div className="flex items-center justify-between py-1 text-sm">
              <span className="text-zinc-500">Sick leave</span>
              <span className="font-bold text-zinc-900 dark:text-zinc-100">8 days</span>
            </div>
            <div className="flex items-center justify-between py-1 text-sm">
              <span className="text-zinc-500">Timezone</span>
              <span className="font-bold text-zinc-900 dark:text-zinc-100">Asia/Kolkata</span>
            </div>
          </div>
        </div>
      </div>

      {/* Invite Staff Modal */}
      <InviteStaffModal
        isOpen={isInviteModalOpen}
        onClose={() => setIsInviteModalOpen(false)}
        onInviteStaff={handleInviteStaff}
      />
    </div>
  )
}
