import React from "react"
import { Users2, Search, Plus, Mail } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"

export const EmployeesPage: React.FC = () => {
  const employees = [
    {
      name: "Arjun Mehta",
      email: "arjun@nexora.com",
      role: "HR Generalist",
      dept: "People Operations",
      status: "active",
      joined: "Jan 2024",
    },
    {
      name: "Priya Sharma",
      email: "priya@nexora.com",
      role: "Lead HRBP",
      dept: "People Operations",
      status: "active",
      joined: "Mar 2023",
    },
    {
      name: "Rohan Patel",
      email: "rohan@nexora.com",
      role: "IT Specialist",
      dept: "IT Support",
      status: "active",
      joined: "Jul 2024",
    },
    {
      name: "Sneha Reddy",
      email: "sneha@nexora.com",
      role: "Senior Product Designer",
      dept: "Design",
      status: "active",
      joined: "Nov 2023",
    },
    {
      name: "Devin Vance",
      email: "devin@nexora.com",
      role: "VP People & Culture",
      dept: "Executive",
      status: "active",
      joined: "Feb 2022",
    },
  ]

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
            Employee Directory
          </h1>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
            Manage personnel records, roles, and invitation status
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button size="sm" className="bg-indigo-600 hover:bg-indigo-700 text-white gap-1.5">
            <Plus className="h-4 w-4" />
            <span>Invite Employee</span>
          </Button>
        </div>
      </div>

      <div className="rounded-lg border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900 p-5 space-y-4">
        <div className="flex items-center justify-between gap-4">
          <div className="relative w-72">
            <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-400" />
            <Input
              placeholder="Search by name, email or department..."
              className="h-8 pl-8 text-xs"
            />
          </div>
          <span className="text-xs text-zinc-500 tabular-nums">
            Showing {employees.length} employees
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-zinc-200 dark:border-zinc-800 text-zinc-500 uppercase text-[11px]">
                <th className="py-2.5 px-3 font-medium">Name</th>
                <th className="py-2.5 px-3 font-medium">Email</th>
                <th className="py-2.5 px-3 font-medium">Role</th>
                <th className="py-2.5 px-3 font-medium">Department</th>
                <th className="py-2.5 px-3 font-medium">Joined</th>
                <th className="py-2.5 px-3 font-medium text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/60">
              {employees.map((emp) => (
                <tr key={emp.email} className="h-10 hover:bg-zinc-50 dark:hover:bg-zinc-800/40">
                  <td className="py-2 px-3 font-semibold text-zinc-900 dark:text-zinc-100">
                    {emp.name}
                  </td>
                  <td className="py-2 px-3 text-zinc-500">{emp.email}</td>
                  <td className="py-2 px-3 text-zinc-700 dark:text-zinc-300 font-medium">
                    {emp.role}
                  </td>
                  <td className="py-2 px-3 text-zinc-500">{emp.dept}</td>
                  <td className="py-2 px-3 text-zinc-500 tabular-nums">{emp.joined}</td>
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
