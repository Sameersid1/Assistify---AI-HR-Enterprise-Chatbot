import React from "react"
import { Link } from "react-router-dom"
import {
  Calendar,
  Clock,
  CheckCircle2,
  AlertCircle,
  MessageSquare,
  ArrowUpRight,
  FileText,
  Plus,
  Users,
  Ticket,
} from "lucide-react"
import { useAuth } from "@/context/AuthContext"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"

export const DashboardPage: React.FC = () => {
  const { user } = useAuth()
  const role = user?.role || "hr"

  return (
    <div className="space-y-6">
      {/* Top Banner / Welcome */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
            Welcome back, {user?.name || "Arjun"}
          </h1>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
            Nexora Technologies • {role.toUpperCase()} Workspace
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Link to="/app/chat">
            <Button size="sm" className="bg-indigo-600 hover:bg-indigo-700 text-white gap-2">
              <MessageSquare className="h-4 w-4" />
              <span>Ask Assistify</span>
            </Button>
          </Link>
          {role === "hr" && (
            <Link to="/app/leave-approvals">
              <Button variant="outline" size="sm" className="gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                <span>Pending Approvals (4)</span>
              </Button>
            </Link>
          )}
        </div>
      </div>

      {/* Metrics Row: 4 Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
          <div className="flex items-center justify-between text-xs text-zinc-500 dark:text-zinc-400">
            <span>Casual Leaves</span>
            <Calendar className="h-4 w-4 text-zinc-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-semibold tabular-nums text-zinc-900 dark:text-zinc-100">
              8
            </span>
            <span className="text-xs text-zinc-400">/ 12 remaining</span>
          </div>
          <div className="mt-2 text-[11px] text-zinc-500">
            Next reset on Jan 1, 2027
          </div>
        </div>

        <div className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
          <div className="flex items-center justify-between text-xs text-zinc-500 dark:text-zinc-400">
            <span>Earned / Privilege Leaves</span>
            <Clock className="h-4 w-4 text-zinc-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-semibold tabular-nums text-zinc-900 dark:text-zinc-100">
              14.5
            </span>
            <span className="text-xs text-zinc-400">days accrued</span>
          </div>
          <div className="mt-2 text-[11px] text-emerald-600 dark:text-emerald-400">
            Eligible for encashment
          </div>
        </div>

        <div className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
          <div className="flex items-center justify-between text-xs text-zinc-500 dark:text-zinc-400">
            <span>Active Tickets</span>
            <Ticket className="h-4 w-4 text-zinc-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-semibold tabular-nums text-zinc-900 dark:text-zinc-100">
              {role === "hr" ? "5" : "2"}
            </span>
            <span className="text-xs text-amber-600">in progress</span>
          </div>
          <div className="mt-2 text-[11px] text-zinc-500">
            Avg resolution: 4.2 hrs
          </div>
        </div>

        <div className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
          <div className="flex items-center justify-between text-xs text-zinc-500 dark:text-zinc-400">
            <span>Active Policies Indexed</span>
            <FileText className="h-4 w-4 text-zinc-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-semibold tabular-nums text-zinc-900 dark:text-zinc-100">
              28
            </span>
            <span className="text-xs text-zinc-400">documents</span>
          </div>
          <div className="mt-2 text-[11px] text-indigo-600 dark:text-indigo-400">
            Updated 2 days ago
          </div>
        </div>
      </div>

      {/* Main Grid: Left Recent Activity Table (65%) & Right Quick Actions / AI Prompts (35%) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Requests / Tickets Table */}
        <div className="lg:col-span-2 rounded-lg border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900 p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-medium text-zinc-500 uppercase tracking-wide">
                Recent HR & Support Activity
              </h2>
              <p className="text-xs text-zinc-400 mt-0.5">
                Real-time tracking of leave applications, queries, and claims
              </p>
            </div>
            <Link to={role === "hr" ? "/app/tickets" : "/app/my-tickets"}>
              <Button variant="ghost" size="sm" className="text-xs text-indigo-600 hover:text-indigo-700">
                View all
              </Button>
            </Link>
          </div>

          {/* Dense Table: 40px rows, py-2 px-3 cells */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-zinc-200 dark:border-zinc-800 text-zinc-500 uppercase text-[11px]">
                  <th className="py-2.5 px-3 font-medium">Request ID</th>
                  <th className="py-2.5 px-3 font-medium">Employee / Topic</th>
                  <th className="py-2.5 px-3 font-medium">Type</th>
                  <th className="py-2.5 px-3 font-medium">Date</th>
                  <th className="py-2.5 px-3 font-medium text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/60">
                <tr className="h-10 hover:bg-zinc-50 dark:hover:bg-zinc-800/40">
                  <td className="py-2 px-3 font-mono text-zinc-500 tabular-nums">REQ-2026-089</td>
                  <td className="py-2 px-3 font-medium text-zinc-900 dark:text-zinc-100">
                    Casual Leave (2 days)
                  </td>
                  <td className="py-2 px-3 text-zinc-500">Leave Application</td>
                  <td className="py-2 px-3 text-zinc-500 tabular-nums">Aug 04, 2026</td>
                  <td className="py-2 px-3 text-right">
                    <Badge variant="pending">Pending HR</Badge>
                  </td>
                </tr>
                <tr className="h-10 hover:bg-zinc-50 dark:hover:bg-zinc-800/40">
                  <td className="py-2 px-3 font-mono text-zinc-500 tabular-nums">REQ-2026-088</td>
                  <td className="py-2 px-3 font-medium text-zinc-900 dark:text-zinc-100">
                    Medical Insurance Card Re-issue
                  </td>
                  <td className="py-2 px-3 text-zinc-500">Benefits</td>
                  <td className="py-2 px-3 text-zinc-500 tabular-nums">Aug 03, 2026</td>
                  <td className="py-2 px-3 text-right">
                    <Badge variant="active">Approved</Badge>
                  </td>
                </tr>
                <tr className="h-10 hover:bg-zinc-50 dark:hover:bg-zinc-800/40">
                  <td className="py-2 px-3 font-mono text-zinc-500 tabular-nums">REQ-2026-085</td>
                  <td className="py-2 px-3 font-medium text-zinc-900 dark:text-zinc-100">
                    Gym Allowance Reimbursement
                  </td>
                  <td className="py-2 px-3 text-zinc-500">Expense Claim</td>
                  <td className="py-2 px-3 text-zinc-500 tabular-nums">Jul 30, 2026</td>
                  <td className="py-2 px-3 text-right">
                    <Badge variant="active">Approved</Badge>
                  </td>
                </tr>
                <tr className="h-10 hover:bg-zinc-50 dark:hover:bg-zinc-800/40">
                  <td className="py-2 px-3 font-mono text-zinc-500 tabular-nums">REQ-2026-079</td>
                  <td className="py-2 px-3 font-medium text-zinc-900 dark:text-zinc-100">
                    VPN Access Configuration
                  </td>
                  <td className="py-2 px-3 text-zinc-500">IT Support</td>
                  <td className="py-2 px-3 text-zinc-500 tabular-nums">Jul 28, 2026</td>
                  <td className="py-2 px-3 text-right">
                    <Badge variant="inactive">Closed</Badge>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Right Column: AI Quick Questions & Action Center */}
        <div className="space-y-4">
          {/* Quick AI Prompts */}
          <div className="rounded-lg border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900 p-5 space-y-3">
            <h2 className="text-sm font-medium text-zinc-500 uppercase tracking-wide">
              Quick AI Inquiries
            </h2>
            <div className="space-y-2">
              <Link
                to="/app/chat"
                className="group flex items-center justify-between rounded-md border border-zinc-200 dark:border-zinc-800 p-2.5 text-xs text-zinc-700 dark:text-zinc-300 hover:border-indigo-300 hover:bg-indigo-50/40 dark:hover:border-zinc-700 transition-colors"
              >
                <span>&ldquo;How do I claim broadband allowance?&rdquo;</span>
                <ArrowUpRight className="h-3.5 w-3.5 text-zinc-400 group-hover:text-indigo-600 transition-colors" />
              </Link>
              <Link
                to="/app/chat"
                className="group flex items-center justify-between rounded-md border border-zinc-200 dark:border-zinc-800 p-2.5 text-xs text-zinc-700 dark:text-zinc-300 hover:border-indigo-300 hover:bg-indigo-50/40 dark:hover:border-zinc-700 transition-colors"
              >
                <span>&ldquo;What is our parental leave policy?&rdquo;</span>
                <ArrowUpRight className="h-3.5 w-3.5 text-zinc-400 group-hover:text-indigo-600 transition-colors" />
              </Link>
              <Link
                to="/app/chat"
                className="group flex items-center justify-between rounded-md border border-zinc-200 dark:border-zinc-800 p-2.5 text-xs text-zinc-700 dark:text-zinc-300 hover:border-indigo-300 hover:bg-indigo-50/40 dark:hover:border-zinc-700 transition-colors"
              >
                <span>&ldquo;Apply for 1 day casual leave tomorrow&rdquo;</span>
                <ArrowUpRight className="h-3.5 w-3.5 text-zinc-400 group-hover:text-indigo-600 transition-colors" />
              </Link>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="rounded-lg border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900 p-5 space-y-3">
            <h2 className="text-sm font-medium text-zinc-500 uppercase tracking-wide">
              Quick Actions
            </h2>
            <div className="grid grid-cols-2 gap-2">
              <Link to="/app/chat">
                <Button variant="outline" size="sm" className="w-full text-xs justify-start h-8">
                  <Plus className="mr-1.5 h-3.5 w-3.5 text-indigo-600" />
                  <span>Apply Leave</span>
                </Button>
              </Link>
              <Link to={role === "hr" ? "/app/tickets" : "/app/my-tickets"}>
                <Button variant="outline" size="sm" className="w-full text-xs justify-start h-8">
                  <Plus className="mr-1.5 h-3.5 w-3.5 text-zinc-600" />
                  <span>Raise Ticket</span>
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
