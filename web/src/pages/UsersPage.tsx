import React from "react"
import { UserCog, Plus, Search } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"

export const UsersPage: React.FC = () => {
  const users = [
    { name: "Arjun Mehta", email: "arjun@nexora.com", role: "HR Admin", status: "active" },
    { name: "Vikram Malhotra", email: "admin@nexora.com", role: "Super Admin", status: "active" },
    { name: "Priya Sharma", email: "hr@nexora.com", role: "HR Admin", status: "active" },
    { name: "Rohan Patel", email: "it@nexora.com", role: "IT Support", status: "active" },
  ]

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
            User & Role Management
          </h1>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
            Configure system permissions, RBAC tiers, and access credentials
          </p>
        </div>

        <Button size="sm" className="bg-indigo-600 hover:bg-indigo-700 text-white gap-1.5">
          <Plus className="h-4 w-4" />
          <span>Add System User</span>
        </Button>
      </div>

      <div className="rounded-lg border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900 p-5 space-y-4">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-zinc-200 dark:border-zinc-800 text-zinc-500 uppercase text-[11px]">
                <th className="py-2.5 px-3 font-medium">Name</th>
                <th className="py-2.5 px-3 font-medium">Email</th>
                <th className="py-2.5 px-3 font-medium">Role</th>
                <th className="py-2.5 px-3 font-medium text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/60">
              {users.map((u) => (
                <tr key={u.email} className="h-10 hover:bg-zinc-50 dark:hover:bg-zinc-800/40">
                  <td className="py-2 px-3 font-semibold text-zinc-900 dark:text-zinc-100">{u.name}</td>
                  <td className="py-2 px-3 text-zinc-500">{u.email}</td>
                  <td className="py-2 px-3 font-medium text-indigo-600 dark:text-indigo-400">{u.role}</td>
                  <td className="py-2 px-3 text-right">
                    <Badge variant="active">Active</Badge>
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
