import React, { useState } from "react"
import { UserCog, Plus, Search, Shield, ShieldCheck, Mail, Lock } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { InviteStaffModal, type StaffInviteData } from "@/components/modals/InviteStaffModal"

interface SystemUser {
  id: string
  name: string
  email: string
  role: string
  roleTier: "admin" | "hr" | "it_support"
  status: "active" | "invited"
  lastActive: string
}

const INITIAL_USERS: SystemUser[] = [
  { id: "u-1", name: "Vikram Malhotra", email: "admin@nexora.com", role: "Super Administrator", roleTier: "admin", status: "active", lastActive: "Just now" },
  { id: "u-2", name: "Priya Sharma", email: "priya.hr@nexora.com", role: "HR Manager", roleTier: "hr", status: "active", lastActive: "14m ago" },
  { id: "u-3", name: "Rohan Patel", email: "rohan.it@nexora.com", role: "IT Support Specialist", roleTier: "it_support", status: "active", lastActive: "1h ago" },
  { id: "u-4", name: "Aditi Sharma", email: "aditi.hr@nexora.com", role: "HRBP Specialist", roleTier: "hr", status: "invited", lastActive: "Pending activation" },
]

export const UsersPage: React.FC = () => {
  const [users, setUsers] = useState<SystemUser[]>(INITIAL_USERS)
  const [searchTerm, setSearchTerm] = useState("")
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false)

  const handleInviteStaff = (staff: StaffInviteData) => {
    const newUser: SystemUser = {
      id: staff.id,
      name: staff.name,
      email: staff.email,
      role: staff.role === "admin" ? "Administrator" : staff.role === "hr" ? "HR Manager" : "IT Support Specialist",
      roleTier: staff.role,
      status: "invited",
      lastActive: "Pending activation",
    }
    setUsers([newUser, ...users])
  }

  const getRoleBadge = (tier: "admin" | "hr" | "it_support") => {
    switch (tier) {
      case "admin":
        return <Badge variant="active" className="text-[10px] font-mono uppercase bg-indigo-600 text-white">Admin</Badge>
      case "hr":
        return <Badge variant="pending" className="text-[10px] font-mono uppercase">HR Ops</Badge>
      case "it_support":
        return <Badge variant="outline" className="text-[10px] font-mono uppercase border-sky-400 text-sky-600">IT Support</Badge>
    }
  }

  const getInitials = (name: string) => {
    return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)
  }

  const filteredUsers = users.filter(
    (u) =>
      u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.role.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <div className="space-y-6 font-sans w-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-zinc-200/90 dark:border-zinc-800/90 pb-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-50">
            User & Role Management
          </h1>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
            Configure system permissions, invite HR / IT staff, and audit access credentials
          </p>
        </div>

        <Button
          size="sm"
          onClick={() => setIsInviteModalOpen(true)}
          className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold gap-1.5 h-8.5 px-4 shadow-xs"
        >
          <Plus className="h-4 w-4" />
          <span>Invite HR / Staff</span>
        </Button>
      </div>

      {/* Users Table Card */}
      <div className="rounded-2xl border border-zinc-200/90 bg-white dark:border-zinc-800/90 dark:bg-zinc-900 p-5 space-y-4 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="relative w-full max-w-md">
            <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-400" />
            <Input
              placeholder="Search staff by name or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="h-8.5 pl-9 text-xs"
            />
          </div>

          <span className="text-xs text-zinc-400 font-mono font-medium">
            {filteredUsers.length} privileged staff accounts
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-zinc-100 dark:border-zinc-800 text-zinc-400 uppercase text-[11px] font-bold bg-zinc-50/50 dark:bg-zinc-900/50">
                <th className="py-2.5 px-4 font-bold">Staff Member</th>
                <th className="py-2.5 px-3 font-bold">System Role</th>
                <th className="py-2.5 px-3 font-bold">Tier</th>
                <th className="py-2.5 px-3 font-bold">Last Active</th>
                <th className="py-2.5 px-4 font-bold text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/60">
              {filteredUsers.map((u) => (
                <tr key={u.id} className="h-12 hover:bg-zinc-50/70 dark:hover:bg-zinc-800/40 transition-colors">
                  <td className="py-2 px-4">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-7.5 w-7.5 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 text-xs font-bold">
                        <AvatarFallback>{getInitials(u.name)}</AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <p className="font-bold text-zinc-900 dark:text-zinc-100 truncate">{u.name}</p>
                        <p className="text-[11px] text-zinc-400 font-mono truncate">{u.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="py-2 px-3 font-medium text-zinc-800 dark:text-zinc-200 whitespace-nowrap">
                    {u.role}
                  </td>
                  <td className="py-2 px-3 whitespace-nowrap">
                    {getRoleBadge(u.roleTier)}
                  </td>
                  <td className="py-2 px-3 text-zinc-500 font-mono text-xs whitespace-nowrap">
                    {u.lastActive}
                  </td>
                  <td className="py-2 px-4 text-right whitespace-nowrap">
                    {u.status === "invited" ? (
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

      {/* Invite Staff Modal Component */}
      <InviteStaffModal
        isOpen={isInviteModalOpen}
        onClose={() => setIsInviteModalOpen(false)}
        onInviteStaff={handleInviteStaff}
      />
    </div>
  )
}
