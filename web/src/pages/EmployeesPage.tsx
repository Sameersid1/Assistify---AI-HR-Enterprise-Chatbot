import React, { useState } from "react"
import { Users2, Search, Plus, Mail, Filter, Building2, Calendar, MoreVertical, Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { AddEmployeeModal, type EmployeeData } from "@/components/modals/AddEmployeeModal"

const INITIAL_EMPLOYEES: EmployeeData[] = [
  {
    name: "Arjun Mehta",
    email: "arjun@nexora.com",
    role: "Senior Frontend Engineer",
    dept: "Engineering",
    status: "active",
    joined: "Jan 2024",
    type: "Full-time",
  },
  {
    name: "Priya Sharma",
    email: "priya@nexora.com",
    role: "Lead HRBP",
    dept: "People Operations",
    status: "active",
    joined: "Mar 2023",
    type: "Full-time",
  },
  {
    name: "Rohan Patel",
    email: "rohan@nexora.com",
    role: "IT Support Specialist",
    dept: "IT Support",
    status: "active",
    joined: "Jul 2024",
    type: "Full-time",
  },
  {
    name: "Sneha Reddy",
    email: "sneha@nexora.com",
    role: "Senior Product Designer",
    dept: "Product Design",
    status: "active",
    joined: "Nov 2023",
    type: "Full-time",
  },
  {
    name: "Devin Vance",
    email: "devin@nexora.com",
    role: "VP People & Culture",
    dept: "People Operations",
    status: "active",
    joined: "Feb 2022",
    type: "Full-time",
  },
  {
    name: "Kavita Krishnan",
    email: "kavita@nexora.com",
    role: "Staff Backend Engineer",
    dept: "Engineering",
    status: "active",
    joined: "May 2023",
    type: "Full-time",
  },
]

export const EmployeesPage: React.FC = () => {
  const [employees, setEmployees] = useState<EmployeeData[]>(INITIAL_EMPLOYEES)
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedDept, setSelectedDept] = useState("all")
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [selectedEmployee, setSelectedEmployee] = useState<EmployeeData | null>(null)

  const handleAddEmployee = (newEmp: EmployeeData) => {
    setEmployees([newEmp, ...employees])
  }

  const filteredEmployees = employees.filter((emp) => {
    const matchesSearch =
      emp.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      emp.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      emp.role.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesDept = selectedDept === "all" || emp.dept === selectedDept
    return matchesSearch && matchesDept
  })

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2)
  }

  return (
    <div className="space-y-6 font-sans w-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-zinc-200/90 dark:border-zinc-800/90 pb-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-50">
            Employee Directory
          </h1>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
            Manage personnel records, roles, departmental assignments, and activation invites
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            onClick={() => setIsAddModalOpen(true)}
            className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold gap-1.5 h-8.5 px-4 shadow-xs"
          >
            <Plus className="h-4 w-4" />
            <span>Add Employee</span>
          </Button>
        </div>
      </div>

      {/* Directory Table Card */}
      <div className="rounded-2xl border border-zinc-200/90 bg-white dark:border-zinc-800/90 dark:bg-zinc-900 p-5 space-y-4 shadow-xs">
        {/* Filters */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 flex-1 max-w-md">
            <div className="relative w-full">
              <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-400" />
              <Input
                placeholder="Search by name, role, or email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="h-8.5 pl-9 text-xs"
              />
            </div>

            <select
              value={selectedDept}
              onChange={(e) => setSelectedDept(e.target.value)}
              className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 py-1.5 px-3 text-xs text-zinc-700 dark:text-zinc-300 font-medium shrink-0"
            >
              <option value="all">All Departments</option>
              <option value="Engineering">Engineering</option>
              <option value="Product Design">Product Design</option>
              <option value="People Operations">People Operations</option>
              <option value="IT Support">IT Support</option>
            </select>
          </div>

          <span className="text-xs text-zinc-400 font-mono font-medium">
            Showing {filteredEmployees.length} of {employees.length} records
          </span>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-zinc-100 dark:border-zinc-800 text-zinc-400 uppercase text-[11px] font-bold bg-zinc-50/50 dark:bg-zinc-900/50">
                <th className="py-2.5 px-4 font-bold">Employee</th>
                <th className="py-2.5 px-3 font-bold">Designation</th>
                <th className="py-2.5 px-3 font-bold">Department</th>
                <th className="py-2.5 px-3 font-bold">Joined</th>
                <th className="py-2.5 px-4 font-bold text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/60">
              {filteredEmployees.map((emp) => (
                <tr
                  key={emp.email}
                  onClick={() => setSelectedEmployee(emp)}
                  className="h-12 hover:bg-zinc-50/70 dark:hover:bg-zinc-800/40 cursor-pointer transition-colors"
                >
                  <td className="py-2 px-4">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-7.5 w-7.5 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 text-xs font-bold">
                        <AvatarFallback>{getInitials(emp.name)}</AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <p className="font-bold text-zinc-900 dark:text-zinc-100 truncate">{emp.name}</p>
                        <p className="text-[11px] text-zinc-400 font-mono truncate">{emp.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="py-2 px-3 font-medium text-zinc-800 dark:text-zinc-200 whitespace-nowrap">
                    {emp.role}
                  </td>
                  <td className="py-2 px-3 whitespace-nowrap">
                    <Badge variant="outline" className="text-[11px] font-medium py-0.5 px-2">
                      {emp.dept}
                    </Badge>
                  </td>
                  <td className="py-2 px-3 text-zinc-500 font-mono text-xs whitespace-nowrap">
                    {emp.joined}
                  </td>
                  <td className="py-2 px-4 text-right whitespace-nowrap">
                    {emp.status === "invited" ? (
                      <Badge variant="pending" className="text-[10px] uppercase font-mono">Invited</Badge>
                    ) : (
                      <Badge variant="active" className="text-[10px] uppercase font-mono">Active</Badge>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Employee Modal Component */}
      <AddEmployeeModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onAddEmployee={handleAddEmployee}
      />
    </div>
  )
}
