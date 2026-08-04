import React from "react"
import { Ticket, Plus, Search } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"

export const MyTicketsPage: React.FC = () => {
  const tickets = [
    { id: "TCK-809", subject: "Broadband Reimbursement Invoice Approval", type: "Expense Claim", date: "Aug 02, 2026", status: "pending" },
    { id: "TCK-771", subject: "MacBook Pro Battery Health Checkup", type: "IT Support", date: "Jul 22, 2026", status: "active" },
  ]

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
            My Support Tickets
          </h1>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
            Status of inquiries and requests submitted by you
          </p>
        </div>

        <Button size="sm" className="bg-indigo-600 hover:bg-indigo-700 text-white gap-1.5">
          <Plus className="h-4 w-4" />
          <span>Raise New Ticket</span>
        </Button>
      </div>

      <div className="rounded-lg border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900 p-5 space-y-4">
        <div className="flex items-center justify-between gap-4">
          <div className="relative w-72">
            <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-400" />
            <Input placeholder="Search your tickets..." className="h-8 pl-8 text-xs" />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-zinc-200 dark:border-zinc-800 text-zinc-500 uppercase text-[11px]">
                <th className="py-2.5 px-3 font-medium">Ticket ID</th>
                <th className="py-2.5 px-3 font-medium">Subject</th>
                <th className="py-2.5 px-3 font-medium">Type</th>
                <th className="py-2.5 px-3 font-medium">Date Submitted</th>
                <th className="py-2.5 px-3 font-medium text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/60">
              {tickets.map((t) => (
                <tr key={t.id} className="h-10 hover:bg-zinc-50 dark:hover:bg-zinc-800/40">
                  <td className="py-2 px-3 font-mono text-zinc-500 tabular-nums">{t.id}</td>
                  <td className="py-2 px-3 font-semibold text-zinc-900 dark:text-zinc-100">{t.subject}</td>
                  <td className="py-2 px-3 text-zinc-500">{t.type}</td>
                  <td className="py-2 px-3 text-zinc-500 tabular-nums">{t.date}</td>
                  <td className="py-2 px-3 text-right">
                    <Badge variant={t.status === "active" ? "active" : "pending"}>
                      {t.status === "active" ? "In Progress" : "Under Review"}
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
