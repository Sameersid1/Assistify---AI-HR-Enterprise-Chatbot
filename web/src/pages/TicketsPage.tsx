import React from "react"
import { LifeBuoy, Plus, Search, Filter } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"

export const TicketsPage: React.FC = () => {
  const tickets = [
    { id: "TCK-801", subject: "Salary Slip July 2026 Discrepancy", raisedBy: "Sneha Reddy", priority: "High", date: "Aug 03, 2026", status: "pending" },
    { id: "TCK-799", subject: "PF Account Transfer Request", raisedBy: "Karan Johar", priority: "Medium", date: "Aug 02, 2026", status: "active" },
    { id: "TCK-795", subject: "Confirmation Letter for Visa", raisedBy: "Aarav Gupta", priority: "Low", date: "Jul 31, 2026", status: "active" },
    { id: "TCK-784", subject: "Relocation Allowance Clarification", raisedBy: "Devin Vance", priority: "Medium", date: "Jul 25, 2026", status: "inactive" },
  ]

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
            Support Tickets (HR Queue)
          </h1>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
            Track and resolve employee inquiries escalated from the AI Assistant
          </p>
        </div>

        <Button size="sm" className="bg-indigo-600 hover:bg-indigo-700 text-white gap-1.5">
          <Plus className="h-4 w-4" />
          <span>New Ticket</span>
        </Button>
      </div>

      <div className="rounded-lg border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900 p-5 space-y-4">
        <div className="flex items-center justify-between gap-4">
          <div className="relative w-72">
            <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-400" />
            <Input placeholder="Filter tickets..." className="h-8 pl-8 text-xs" />
          </div>
          <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs">
            <Filter className="h-3.5 w-3.5" />
            <span>Filter</span>
          </Button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-zinc-200 dark:border-zinc-800 text-zinc-500 uppercase text-[11px]">
                <th className="py-2.5 px-3 font-medium">Ticket ID</th>
                <th className="py-2.5 px-3 font-medium">Subject</th>
                <th className="py-2.5 px-3 font-medium">Raised By</th>
                <th className="py-2.5 px-3 font-medium">Priority</th>
                <th className="py-2.5 px-3 font-medium">Created Date</th>
                <th className="py-2.5 px-3 font-medium text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/60">
              {tickets.map((t) => (
                <tr key={t.id} className="h-10 hover:bg-zinc-50 dark:hover:bg-zinc-800/40">
                  <td className="py-2 px-3 font-mono text-zinc-500 tabular-nums">{t.id}</td>
                  <td className="py-2 px-3 font-semibold text-zinc-900 dark:text-zinc-100">{t.subject}</td>
                  <td className="py-2 px-3 text-zinc-500">{t.raisedBy}</td>
                  <td className="py-2 px-3 font-medium">{t.priority}</td>
                  <td className="py-2 px-3 text-zinc-500 tabular-nums">{t.date}</td>
                  <td className="py-2 px-3 text-right">
                    <Badge variant={t.status === "active" ? "active" : t.status === "pending" ? "pending" : "inactive"}>
                      {t.status === "active" ? "In Progress" : t.status === "pending" ? "Awaiting HR" : "Resolved"}
                    </Badge>
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
