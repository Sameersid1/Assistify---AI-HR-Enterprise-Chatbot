import React from "react"
import { Terminal, Plus, Search } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"

export const ITTicketsPage: React.FC = () => {
  const itTickets = [
    { id: "IT-409", subject: "GitHub Copilot Enterprise License Provisioning", raisedBy: "Sneha Reddy", priority: "Medium", status: "active" },
    { id: "IT-402", subject: "AWS Sandbox Access IAM Role Request", raisedBy: "Aarav Gupta", priority: "High", status: "pending" },
    { id: "IT-395", subject: "YubiKey Replacement for 2FA", raisedBy: "Devin Vance", priority: "Low", status: "inactive" },
  ]

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
            IT Support Tickets
          </h1>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
            Hardware, software licenses, VPN, and infrastructure access management
          </p>
        </div>
      </div>

      <div className="rounded-lg border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900 p-5 space-y-4">
        <div className="flex items-center justify-between gap-4">
          <div className="relative w-72">
            <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-400" />
            <Input placeholder="Filter IT tickets..." className="h-8 pl-8 text-xs" />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-zinc-200 dark:border-zinc-800 text-zinc-500 uppercase text-[11px]">
                <th className="py-2.5 px-3 font-medium">Ticket ID</th>
                <th className="py-2.5 px-3 font-medium">Subject</th>
                <th className="py-2.5 px-3 font-medium">Raised By</th>
                <th className="py-2.5 px-3 font-medium">Priority</th>
                <th className="py-2.5 px-3 font-medium text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/60">
              {itTickets.map((t) => (
                <tr key={t.id} className="h-10 hover:bg-zinc-50 dark:hover:bg-zinc-800/40">
                  <td className="py-2 px-3 font-mono text-zinc-500 tabular-nums">{t.id}</td>
                  <td className="py-2 px-3 font-semibold text-zinc-900 dark:text-zinc-100">{t.subject}</td>
                  <td className="py-2 px-3 text-zinc-500">{t.raisedBy}</td>
                  <td className="py-2 px-3 font-medium">{t.priority}</td>
                  <td className="py-2 px-3 text-right">
                    <Badge variant={t.status === "active" ? "active" : t.status === "pending" ? "pending" : "inactive"}>
                      {t.status === "active" ? "In Progress" : t.status === "pending" ? "Pending Assignment" : "Resolved"}
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
