import React, { useState } from "react"
import { Check, X, CalendarCheck, Filter } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"

interface LeaveRequest {
  id: string
  employee: string
  department: string
  leaveType: string
  dates: string
  days: number
  reason: string
  status: "pending" | "approved" | "rejected"
}

export const LeaveApprovalsPage: React.FC = () => {
  const [requests, setRequests] = useState<LeaveRequest[]>([
    {
      id: "LR-2026-101",
      employee: "Devin Vance",
      department: "People Ops",
      leaveType: "Casual Leave",
      dates: "Aug 12 - Aug 13, 2026",
      days: 2,
      reason: "Family personal commitments",
      status: "pending",
    },
    {
      id: "LR-2026-102",
      employee: "Aarav Gupta",
      department: "Engineering",
      leaveType: "Privilege Leave",
      dates: "Aug 18 - Aug 22, 2026",
      days: 5,
      reason: "Annual vacation trip",
      status: "pending",
    },
    {
      id: "LR-2026-103",
      employee: "Sneha Reddy",
      department: "Product Design",
      leaveType: "Sick Leave",
      dates: "Aug 06, 2026",
      days: 1,
      reason: "Dental appointment & recovery",
      status: "pending",
    },
    {
      id: "LR-2026-104",
      employee: "Karan Johar",
      department: "Finance",
      leaveType: "Casual Leave",
      dates: "Aug 14, 2026",
      days: 1,
      reason: "Personal banking work",
      status: "pending",
    },
  ])

  const handleAction = (id: string, newStatus: "approved" | "rejected") => {
    setRequests((prev) =>
      prev.map((req) => (req.id === id ? { ...req, status: newStatus } : req))
    )
  }

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

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="gap-1.5 text-xs">
            <Filter className="h-3.5 w-3.5" />
            <span>Filter Status</span>
          </Button>
        </div>
      </div>

      {/* Approvals Table */}
      <div className="rounded-lg border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900 p-5 space-y-4">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-zinc-200 dark:border-zinc-800 text-zinc-500 uppercase text-[11px]">
                <th className="py-2.5 px-3 font-medium">Request ID</th>
                <th className="py-2.5 px-3 font-medium">Employee</th>
                <th className="py-2.5 px-3 font-medium">Department</th>
                <th className="py-2.5 px-3 font-medium">Leave Type</th>
                <th className="py-2.5 px-3 font-medium">Dates</th>
                <th className="py-2.5 px-3 font-medium">Days</th>
                <th className="py-2.5 px-3 font-medium">Reason</th>
                <th className="py-2.5 px-3 font-medium text-center">Status</th>
                <th className="py-2.5 px-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/60">
              {requests.map((req) => (
                <tr key={req.id} className="h-10 hover:bg-zinc-50 dark:hover:bg-zinc-800/40">
                  <td className="py-2 px-3 font-mono text-zinc-500 tabular-nums">{req.id}</td>
                  <td className="py-2 px-3 font-semibold text-zinc-900 dark:text-zinc-100">
                    {req.employee}
                  </td>
                  <td className="py-2 px-3 text-zinc-500">{req.department}</td>
                  <td className="py-2 px-3 font-medium">{req.leaveType}</td>
                  <td className="py-2 px-3 text-zinc-600 dark:text-zinc-300 tabular-nums">
                    {req.dates}
                  </td>
                  <td className="py-2 px-3 tabular-nums font-semibold">{req.days}d</td>
                  <td className="py-2 px-3 text-zinc-500 max-w-[200px] truncate">{req.reason}</td>
                  <td className="py-2 px-3 text-center">
                    <Badge
                      variant={
                        req.status === "approved"
                          ? "active"
                          : req.status === "rejected"
                          ? "error"
                          : "pending"
                      }
                    >
                      {req.status.charAt(0).toUpperCase() + req.status.slice(1)}
                    </Badge>
                  </td>
                  <td className="py-2 px-3 text-right">
                    {req.status === "pending" ? (
                      <div className="flex items-center justify-end gap-1.5">
                        <Button
                          size="icon-sm"
                          className="h-7 w-7 bg-emerald-600 hover:bg-emerald-700 text-white"
                          onClick={() => handleAction(req.id, "approved")}
                          title="Approve"
                        >
                          <Check className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          size="icon-sm"
                          variant="outline"
                          className="h-7 w-7 border-rose-200 text-rose-600 hover:bg-rose-50"
                          onClick={() => handleAction(req.id, "rejected")}
                          title="Reject"
                        >
                          <X className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    ) : (
                      <span className="text-[11px] text-zinc-400">Processed</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
