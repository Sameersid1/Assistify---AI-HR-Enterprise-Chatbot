import React, { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  UserCheck,
  Mail,
  ShieldAlert,
  Shield,
  CheckCircle2,
  Copy,
  Sparkles,
  Lock,
  Headphones,
  Sliders,
} from "lucide-react"

export interface StaffInviteData {
  id: string
  name: string
  email: string
  role: "hr" | "it_support" | "admin"
  permissions: string[]
  expiresIn: string
}

interface InviteStaffModalProps {
  isOpen: boolean
  onClose: () => void
  onInviteStaff: (staff: StaffInviteData) => void
}

export const InviteStaffModal: React.FC<InviteStaffModalProps> = ({
  isOpen,
  onClose,
  onInviteStaff,
}) => {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    role: "hr" as "hr" | "it_support" | "admin",
    expiry: "72h",
  })

  const [permissions, setPermissions] = useState<Record<string, boolean>>({
    leave_approvals: true,
    employee_mgmt: true,
    policy_docs: true,
    analytics_view: true,
    audit_logs: false,
    system_settings: false,
  })

  const [createdInviteLink, setCreatedInviteLink] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  const handleRoleChange = (role: "hr" | "it_support" | "admin") => {
    setFormData({ ...formData, role })
    if (role === "admin") {
      setPermissions({
        leave_approvals: true,
        employee_mgmt: true,
        policy_docs: true,
        analytics_view: true,
        audit_logs: true,
        system_settings: true,
      })
    } else if (role === "hr") {
      setPermissions({
        leave_approvals: true,
        employee_mgmt: true,
        policy_docs: true,
        analytics_view: true,
        audit_logs: false,
        system_settings: false,
      })
    } else if (role === "it_support") {
      setPermissions({
        leave_approvals: false,
        employee_mgmt: true,
        policy_docs: true,
        analytics_view: false,
        audit_logs: false,
        system_settings: false,
      })
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.email) return

    const activePermissions = Object.keys(permissions).filter((k) => permissions[k])
    const newStaff: StaffInviteData = {
      id: `inv-${Date.now().toString().slice(-4)}`,
      name: formData.name || formData.email.split("@")[0],
      email: formData.email,
      role: formData.role,
      permissions: activePermissions,
      expiresIn: formData.expiry,
    }

    onInviteStaff(newStaff)

    // Generate mock activation token
    const token = `adm_${Math.random().toString(36).substring(2, 10)}`
    const activationUrl = `${window.location.origin}/activate?token=${token}&email=${encodeURIComponent(formData.email)}&role=${formData.role}&name=${encodeURIComponent(formData.name || "")}`
    setCreatedInviteLink(activationUrl)
  }

  const handleCopy = () => {
    if (createdInviteLink) {
      navigator.clipboard.writeText(createdInviteLink)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const handleDone = () => {
    setCreatedInviteLink(null)
    setFormData({
      name: "",
      email: "",
      role: "hr",
      expiry: "72h",
    })
    onClose()
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-xl p-0 overflow-hidden border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl">
        {/* Header */}
        <div className="bg-gradient-to-r from-amber-50/80 via-white to-amber-50/30 dark:from-amber-950/40 dark:via-zinc-900 dark:to-zinc-900 px-6 py-5 border-b border-zinc-200/80 dark:border-zinc-800">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500 text-white shadow-xs">
              <Shield className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-lg font-bold text-zinc-900 dark:text-zinc-50">
                Invite Staff & System Roles
              </DialogTitle>
              <DialogDescription className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                Grant elevated access for HR Managers, IT Specialists, or Administrators
              </DialogDescription>
            </div>
          </div>
        </div>

        {/* Modal Content */}
        {createdInviteLink ? (
          <div className="p-6 space-y-5 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400">
              <CheckCircle2 className="h-8 w-8" />
            </div>

            <div className="space-y-1">
              <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
                Staff Invitation Dispatched!
              </h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 max-w-md mx-auto">
                Invitation sent to <strong>{formData.email}</strong> as{" "}
                <strong className="uppercase">{formData.role.replace("_", " ")}</strong>.
              </p>
            </div>

            <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 p-3.5 text-left space-y-2">
              <div className="flex items-center justify-between text-xs font-semibold text-zinc-600 dark:text-zinc-400">
                <span className="flex items-center gap-1.5">
                  <Sparkles className="h-3.5 w-3.5 text-amber-500" />
                  Staff Activation Link
                </span>
                <Badge variant="pending" className="text-[10px] py-0 px-2 font-mono">Expires in {formData.expiry}</Badge>
              </div>
              <div className="flex items-center gap-2">
                <Input
                  readOnly
                  value={createdInviteLink}
                  className="h-8 text-xs font-mono bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 select-all"
                />
                <Button
                  size="sm"
                  onClick={handleCopy}
                  className="h-8 text-xs font-semibold bg-amber-500 hover:bg-amber-600 text-white shrink-0 px-3"
                >
                  {copied ? "Copied!" : <Copy className="h-3.5 w-3.5" />}
                </Button>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <Button onClick={handleDone} className="bg-amber-500 hover:bg-amber-600 text-white text-xs font-semibold h-9 px-5">
                Done & View Pending Invites
              </Button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
            {/* Name & Email */}
            <div className="grid grid-cols-2 gap-3.5">
              <div className="space-y-1.5">
                <label className="font-semibold text-zinc-700 dark:text-zinc-300">
                  Full Name
                </label>
                <Input
                  placeholder="e.g. Priya Sharma"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="h-9 text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <label className="font-semibold text-zinc-700 dark:text-zinc-300">
                  Work Email <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-400" />
                  <Input
                    type="email"
                    required
                    placeholder="priya.hr@nexora.com"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="h-9 pl-9 text-xs"
                  />
                </div>
              </div>
            </div>

            {/* Role Selection Cards */}
            <div className="space-y-2">
              <label className="font-semibold text-zinc-700 dark:text-zinc-300">
                Select Elevated Role Tier <span className="text-rose-500">*</span>
              </label>

              <div className="grid grid-cols-3 gap-2.5">
                <button
                  type="button"
                  onClick={() => handleRoleChange("hr")}
                  className={`p-3 rounded-xl border text-left transition-all ${
                    formData.role === "hr"
                      ? "border-amber-500 bg-amber-50/50 dark:bg-amber-950/40 ring-2 ring-amber-500/20"
                      : "border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
                  }`}
                >
                  <div className="flex items-center gap-1.5 font-bold text-zinc-900 dark:text-zinc-100 text-xs">
                    <UserCheck className="h-4 w-4 text-amber-500" />
                    HR Manager
                  </div>
                  <p className="text-[11px] text-zinc-500 mt-1 line-clamp-2">
                    Review leaves, approve requests & manage employees.
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => handleRoleChange("it_support")}
                  className={`p-3 rounded-xl border text-left transition-all ${
                    formData.role === "it_support"
                      ? "border-sky-500 bg-sky-50/50 dark:bg-sky-950/40 ring-2 ring-sky-500/20"
                      : "border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
                  }`}
                >
                  <div className="flex items-center gap-1.5 font-bold text-zinc-900 dark:text-zinc-100 text-xs">
                    <Headphones className="h-4 w-4 text-sky-500" />
                    IT Support
                  </div>
                  <p className="text-[11px] text-zinc-500 mt-1 line-clamp-2">
                    Resolve tech tickets & hardware provisioning.
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => handleRoleChange("admin")}
                  className={`p-3 rounded-xl border text-left transition-all ${
                    formData.role === "admin"
                      ? "border-indigo-600 bg-indigo-50/50 dark:bg-indigo-950/40 ring-2 ring-indigo-600/20"
                      : "border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
                  }`}
                >
                  <div className="flex items-center gap-1.5 font-bold text-zinc-900 dark:text-zinc-100 text-xs">
                    <Lock className="h-4 w-4 text-indigo-600" />
                    Administrator
                  </div>
                  <p className="text-[11px] text-zinc-500 mt-1 line-clamp-2">
                    Full governance, audit logs & RBAC configuration.
                  </p>
                </button>
              </div>
            </div>

            {/* Granular Permission Checklist */}
            <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/70 dark:bg-zinc-950/60 p-3.5 space-y-2.5">
              <div className="flex items-center justify-between text-xs font-semibold text-zinc-700 dark:text-zinc-300 border-b border-zinc-200/60 dark:border-zinc-800/60 pb-1.5">
                <span className="flex items-center gap-1.5">
                  <Sliders className="h-3.5 w-3.5 text-zinc-500" />
                  Assigned Privileges & Permissions
                </span>
                <span className="text-[11px] text-zinc-400 font-mono">SOC-2 Gated</span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={permissions.leave_approvals}
                    onChange={(e) => setPermissions({ ...permissions, leave_approvals: e.target.checked })}
                    className="rounded text-indigo-600 focus:ring-indigo-500 h-3.5 w-3.5"
                  />
                  <span className="text-zinc-700 dark:text-zinc-300">Approve Employee Leaves</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={permissions.employee_mgmt}
                    onChange={(e) => setPermissions({ ...permissions, employee_mgmt: e.target.checked })}
                    className="rounded text-indigo-600 focus:ring-indigo-500 h-3.5 w-3.5"
                  />
                  <span className="text-zinc-700 dark:text-zinc-300">Manage Employee Records</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={permissions.policy_docs}
                    onChange={(e) => setPermissions({ ...permissions, policy_docs: e.target.checked })}
                    className="rounded text-indigo-600 focus:ring-indigo-500 h-3.5 w-3.5"
                  />
                  <span className="text-zinc-700 dark:text-zinc-300">Publish Policy Documents</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={permissions.audit_logs}
                    onChange={(e) => setPermissions({ ...permissions, audit_logs: e.target.checked })}
                    className="rounded text-indigo-600 focus:ring-indigo-500 h-3.5 w-3.5"
                  />
                  <span className="text-zinc-700 dark:text-zinc-300">Access System Audit Log</span>
                </label>
              </div>
            </div>

            {/* Expiry Selector & Actions */}
            <div className="flex items-center justify-between pt-3 border-t border-zinc-100 dark:border-zinc-800">
              <div className="flex items-center gap-2">
                <span className="text-zinc-500 font-medium">Link Expiry:</span>
                <select
                  value={formData.expiry}
                  onChange={(e) => setFormData({ ...formData, expiry: e.target.value })}
                  className="rounded-md border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 py-1 px-2 text-xs font-semibold"
                >
                  <option value="24h">24 Hours</option>
                  <option value="48h">48 Hours</option>
                  <option value="72h">72 Hours (Recommended)</option>
                  <option value="7d">7 Days</option>
                </select>
              </div>

              <div className="flex items-center gap-2">
                <Button type="button" variant="outline" size="sm" onClick={onClose} className="text-xs h-8">
                  Cancel
                </Button>
                <Button type="submit" size="sm" className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold h-8 px-4 shadow-xs">
                  Generate & Send Invite
                </Button>
              </div>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}
