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
  UserPlus,
  Mail,
  Building2,
  Briefcase,
  Calendar,
  CheckCircle2,
  Copy,
  Sparkles,
  ShieldCheck,
} from "lucide-react"

export interface EmployeeData {
  name: string
  email: string
  role: string
  dept: string
  joined: string
  status: "active" | "invited" | "pending"
  type: string
}

interface AddEmployeeModalProps {
  isOpen: boolean
  onClose: () => void
  onAddEmployee: (emp: EmployeeData) => void
}

export const AddEmployeeModal: React.FC<AddEmployeeModalProps> = ({
  isOpen,
  onClose,
  onAddEmployee,
}) => {
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    department: "Engineering",
    designation: "",
    employmentType: "Full-time",
    joiningDate: new Date().toISOString().split("T")[0],
    sendInvite: true,
  })

  const [createdInviteLink, setCreatedInviteLink] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.firstName || !formData.email) return

    const fullName = `${formData.firstName} ${formData.lastName}`.trim()
    const newEmp: EmployeeData = {
      name: fullName,
      email: formData.email,
      role: formData.designation || "Software Engineer",
      dept: formData.department,
      joined: new Date(formData.joiningDate).toLocaleDateString("en-US", { month: "short", year: "numeric" }),
      status: formData.sendInvite ? "invited" : "active",
      type: formData.employmentType,
    }

    onAddEmployee(newEmp)

    // Generate mock activation token
    const token = `act_${Math.random().toString(36).substring(2, 10)}`
    const activationUrl = `${window.location.origin}/activate?token=${token}&email=${encodeURIComponent(formData.email)}&role=employee&name=${encodeURIComponent(fullName)}`
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
      firstName: "",
      lastName: "",
      email: "",
      department: "Engineering",
      designation: "",
      employmentType: "Full-time",
      joiningDate: new Date().toISOString().split("T")[0],
      sendInvite: true,
    })
    onClose()
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-xl p-0 overflow-hidden border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl">
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-indigo-50/80 via-white to-indigo-50/40 dark:from-indigo-950/40 dark:via-zinc-900 dark:to-zinc-900 px-6 py-5 border-b border-zinc-200/80 dark:border-zinc-800">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-xs">
              <UserPlus className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-lg font-bold text-zinc-900 dark:text-zinc-50">
                Add New Employee
              </DialogTitle>
              <DialogDescription className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                Create employee profile, assign department, and dispatch activation invite
              </DialogDescription>
            </div>
          </div>
        </div>

        {/* Modal Body */}
        {createdInviteLink ? (
          <div className="p-6 space-y-5 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="h-8 w-8" />
            </div>

            <div className="space-y-1">
              <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
                Employee Added Successfully!
              </h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 max-w-md mx-auto">
                An invitation email has been queued for <strong>{formData.email}</strong> with standard 18/12/8 leave allocation.
              </p>
            </div>

            <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 p-3.5 text-left space-y-2">
              <div className="flex items-center justify-between text-xs font-semibold text-zinc-600 dark:text-zinc-400">
                <span className="flex items-center gap-1.5">
                  <Sparkles className="h-3.5 w-3.5 text-indigo-600" />
                  Direct Activation Link
                </span>
                <Badge variant="active" className="text-[10px] py-0 px-2 font-mono">Expires in 7 days</Badge>
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
                  className="h-8 text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white shrink-0 px-3"
                >
                  {copied ? "Copied!" : <Copy className="h-3.5 w-3.5" />}
                </Button>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <Button onClick={handleDone} className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold h-9 px-5">
                Done & View Directory
              </Button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
            {/* Name Fields */}
            <div className="grid grid-cols-2 gap-3.5">
              <div className="space-y-1.5">
                <label className="font-semibold text-zinc-700 dark:text-zinc-300">
                  First Name <span className="text-rose-500">*</span>
                </label>
                <Input
                  required
                  placeholder="e.g. Arjun"
                  value={formData.firstName}
                  onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                  className="h-9 text-xs"
                />
              </div>
              <div className="space-y-1.5">
                <label className="font-semibold text-zinc-700 dark:text-zinc-300">
                  Last Name
                </label>
                <Input
                  placeholder="e.g. Mehta"
                  value={formData.lastName}
                  onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                  className="h-9 text-xs"
                />
              </div>
            </div>

            {/* Email Field */}
            <div className="space-y-1.5">
              <label className="font-semibold text-zinc-700 dark:text-zinc-300">
                Work Email <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-400" />
                <Input
                  type="email"
                  required
                  placeholder="arjun@nexora.com"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="h-9 pl-9 text-xs"
                />
              </div>
            </div>

            {/* Department & Designation */}
            <div className="grid grid-cols-2 gap-3.5">
              <div className="space-y-1.5">
                <label className="font-semibold text-zinc-700 dark:text-zinc-300 flex items-center gap-1">
                  <Building2 className="h-3.5 w-3.5 text-zinc-400" />
                  Department
                </label>
                <select
                  value={formData.department}
                  onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                  className="w-full rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 py-2 px-3 text-xs text-zinc-900 dark:text-zinc-100"
                >
                  <option value="Engineering">Engineering</option>
                  <option value="Product Design">Product Design</option>
                  <option value="People Operations">People Operations</option>
                  <option value="Finance & Accounting">Finance & Accounting</option>
                  <option value="Marketing">Marketing</option>
                  <option value="Sales">Sales</option>
                  <option value="IT Support">IT Support</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="font-semibold text-zinc-700 dark:text-zinc-300 flex items-center gap-1">
                  <Briefcase className="h-3.5 w-3.5 text-zinc-400" />
                  Job Designation
                </label>
                <Input
                  placeholder="e.g. Senior Frontend Dev"
                  value={formData.designation}
                  onChange={(e) => setFormData({ ...formData, designation: e.target.value })}
                  className="h-9 text-xs"
                />
              </div>
            </div>

            {/* Employment Type & Joining Date */}
            <div className="grid grid-cols-2 gap-3.5">
              <div className="space-y-1.5">
                <label className="font-semibold text-zinc-700 dark:text-zinc-300">
                  Employment Type
                </label>
                <select
                  value={formData.employmentType}
                  onChange={(e) => setFormData({ ...formData, employmentType: e.target.value })}
                  className="w-full rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 py-2 px-3 text-xs text-zinc-900 dark:text-zinc-100"
                >
                  <option value="Full-time">Full-time (Salaried)</option>
                  <option value="Contract">Contract</option>
                  <option value="Intern">Intern</option>
                  <option value="Part-time">Part-time</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="font-semibold text-zinc-700 dark:text-zinc-300 flex items-center gap-1">
                  <Calendar className="h-3.5 w-3.5 text-zinc-400" />
                  Joining Date
                </label>
                <Input
                  type="date"
                  value={formData.joiningDate}
                  onChange={(e) => setFormData({ ...formData, joiningDate: e.target.value })}
                  className="h-9 text-xs"
                />
              </div>
            </div>

            {/* Policy & Quota Tier Notice */}
            <div className="rounded-xl border border-zinc-200/80 dark:border-zinc-800 bg-zinc-50/70 dark:bg-zinc-950/60 p-3 flex items-start gap-2.5">
              <ShieldCheck className="h-4 w-4 text-indigo-600 shrink-0 mt-0.5" />
              <div className="text-[11px] text-zinc-600 dark:text-zinc-400 leading-relaxed">
                Default annual leave policy applies: <strong>18 Earned</strong> · <strong>12 Casual</strong> · <strong>8 Sick</strong> days. Onboarding assistify package will be attached.
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-between pt-3 border-t border-zinc-100 dark:border-zinc-800">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={formData.sendInvite}
                  onChange={(e) => setFormData({ ...formData, sendInvite: e.target.checked })}
                  className="rounded text-indigo-600 focus:ring-indigo-500 h-4 w-4"
                />
                <span className="text-xs text-zinc-700 dark:text-zinc-300 font-medium">
                  Dispatch email invitation immediately
                </span>
              </label>

              <div className="flex items-center gap-2">
                <Button type="button" variant="outline" size="sm" onClick={onClose} className="text-xs h-8">
                  Cancel
                </Button>
                <Button type="submit" size="sm" className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold h-8 px-4 shadow-xs">
                  Create & Send Invite
                </Button>
              </div>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}
