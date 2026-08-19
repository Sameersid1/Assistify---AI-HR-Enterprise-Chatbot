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
import { api, ApiError } from "@/lib/api"
import type { InviteRequest, InviteResponse } from "@/lib/types"
import {
  UserCheck,
  Check,
  Mail,
  ShieldAlert,
  Shield,
  CheckCircle2,
  MailWarning,
  Copy,
  Sparkles,
  Lock,
  Headphones,
  Sliders,
  Send,
} from "lucide-react"

export interface StaffInviteData {
  id: string
  name: string
  email: string
  personalEmail?: string
  role: StaffRole
}

type StaffRole = "hr" | "it_support" | "admin"

/**
 * What each role can actually do, taken from the server's route guards and the
 * role-creation whitelist in user.service.ts — not a wish list.
 */
const ROLE_CAPABILITIES: Record<StaffRole, string[]> = {
  hr: [
    "Approve and reject employee leave requests",
    "Invite employees and manage their accounts",
    "Upload policy documents for the assistant to search",
    "Ask the assistant about anyone's leave in the company",
  ],
  it_support: [
    "View the employee directory",
    "Apply for and track their own leave",
    "Ask the assistant about their own records",
  ],
  admin: [
    "Invite HR and IT Support accounts",
    "Deactivate and reactivate any account",
    "Approve and reject leave requests",
    "Upload policy documents for the assistant to search",
  ],
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
    personalEmail: "",
    role: "hr" as StaffRole,
  })

  const [result, setResult] = useState<InviteResponse | null>(null)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [copied, setCopied] = useState(false)

  const handleRoleChange = (role: StaffRole) => setFormData({ ...formData, role })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.email || isSubmitting) return

    setIsSubmitting(true)
    setSubmitError(null)

    try {
      // The server creates the user, mints a single-use token and emails it.
      // It also re-checks the role-creation whitelist (D22), so a role this
      // account may not create is refused here even if the UI offered it.
      const invite = await api.post<InviteResponse>("/users/invite", {
        email: formData.email.trim(),
        ...(formData.personalEmail.trim() ? { personalEmail: formData.personalEmail.trim() } : {}),
        fullName: formData.name.trim() || formData.email.split("@")[0],
        role: formData.role,
      } satisfies InviteRequest)

      setResult(invite)

      // Keep the caller's list in step without waiting for a refetch.
      onInviteStaff({
        id: invite.user.id,
        name: invite.user.fullName,
        email: invite.user.email,
        personalEmail: invite.invitationSentTo,
        role: formData.role,


      })
    } catch (err) {
      setSubmitError(
        err instanceof ApiError
          ? err.code === "EMAIL_TAKEN"
            ? "Someone already has that work email."
            : err.message
          : "Could not send the invitation. Please try again.",
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleCopy = () => {
    if (result) {
      navigator.clipboard.writeText(result.activationUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const handleDone = () => {
    setResult(null)
    setSubmitError(null)
    setFormData({
      name: "",
      email: "",
      personalEmail: "",
      role: "hr",
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
                Invite HR / Staff Member
              </DialogTitle>
              <DialogDescription className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                Grant elevated access and email activation invite to their personal inbox
              </DialogDescription>
            </div>
          </div>
        </div>

        {/* Modal Content */}
        {result ? (
          <div className="p-6 space-y-5 text-center">
            <div
              className={`mx-auto flex h-14 w-14 items-center justify-center rounded-2xl ${
                result.emailSent
                  ? "bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400"
                  : "bg-orange-100 dark:bg-orange-950/60 text-orange-600 dark:text-orange-400"
              }`}
            >
              {result.emailSent ? (
                <CheckCircle2 className="h-8 w-8" />
              ) : (
                <MailWarning className="h-8 w-8" />
              )}
            </div>

            {/* The account exists either way — only delivery can fail. Saying
                "dispatched" after a failed send sends the admin away believing
                an email is on its way that never left, so split the two. */}
            <div className="space-y-1.5">
              <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
                {result.emailSent
                  ? "Staff Invitation Dispatched!"
                  : "Staff created — email could not be sent"}
              </h3>
              {result.emailSent ? (
                <p className="text-xs text-zinc-500 dark:text-zinc-400 max-w-md mx-auto">
                  Activation invitation dispatched to personal inbox:{" "}
                  <strong className="text-amber-600 dark:text-amber-400 font-semibold">
                    {result.invitationSentTo}
                  </strong>
                  <span className="block text-[11px] text-zinc-400 mt-0.5">
                    (Assigned Role: <strong className="uppercase">{formData.role.replace("_", " ")}</strong> · Corporate: {result.user.email})
                  </span>
                </p>
              ) : (
                <div className="text-xs text-zinc-500 dark:text-zinc-400 max-w-md mx-auto space-y-1">
                  <p>The account exists — send them the link below yourself.</p>
                  {result.emailError && (
                    <p className="font-mono text-[11px] text-amber-600 dark:text-amber-400">
                      Mail server said: {result.emailError}
                    </p>
                  )}
                  <p className="text-[11px] text-zinc-400">
                    They'll sign in with: {result.user.email}
                  </p>
                </div>
              )}
            </div>

            <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 p-3.5 text-left space-y-2">
              <div className="flex items-center justify-between text-xs font-semibold text-zinc-600 dark:text-zinc-400">
                <span className="flex items-center gap-1.5">
                  <Sparkles className="h-3.5 w-3.5 text-amber-500" />
                  Staff Activation Link
                </span>
                <Badge variant="pending" className="text-[10px] py-0 px-2 font-mono">Expires in 72 hours</Badge>
              </div>
              <div className="flex items-center gap-2">
                <Input
                  readOnly
                  value={result.activationUrl}
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
            {/* Full Name */}
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

            {/* Work Email & Personal Email */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div className="space-y-1.5">
                <label className="font-semibold text-zinc-700 dark:text-zinc-300">
                  Work Email (Corporate) <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-400" />
                  <Input
                    type="email"
                    required
                    placeholder="name@company.com"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="h-9 pl-9 text-xs"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="font-semibold text-zinc-700 dark:text-zinc-300 flex items-center justify-between">
                  <span>Personal Email (For Invite)</span>
                  <span className="text-[10px] text-amber-600 dark:text-amber-400 font-normal">Sends link here</span>
                </label>
                <div className="relative">
                  <Send className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-400" />
                  <Input
                    type="email"
                    placeholder="priya.personal@gmail.com"
                    value={formData.personalEmail}
                    onChange={(e) => setFormData({ ...formData, personalEmail: e.target.value })}
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

            {/* What the chosen role actually grants.
                This replaced four checkboxes that were never sent anywhere —
                the invite payload is email, name and role. Ticking "Access
                System Audit Log" changed nothing, and there is no audit log.
                Permissions here come from the role, so they are shown, not set. */}
            <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/70 dark:bg-zinc-950/60 p-3.5 space-y-2.5">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-zinc-700 dark:text-zinc-300 border-b border-zinc-200/60 dark:border-zinc-800/60 pb-1.5">
                <Sliders className="h-3.5 w-3.5 text-zinc-500" />
                What this role can do
              </div>
              <ul className="space-y-1.5 text-xs">
                {ROLE_CAPABILITIES[formData.role].map((line) => (
                  <li key={line} className="flex items-start gap-2 text-zinc-700 dark:text-zinc-300">
                    <Check className="h-3.5 w-3.5 mt-px shrink-0 text-emerald-600 dark:text-emerald-400" />
                    <span>{line}</span>
                  </li>
                ))}
              </ul>
              <p className="text-[11px] text-zinc-400 pt-0.5">
                Access follows the role. It is enforced on the server, not chosen here.
              </p>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between pt-3 border-t border-zinc-100 dark:border-zinc-800">
              <span className="text-[11px] text-zinc-400">
                The activation link is single-use and expires in 72 hours.
              </span>

              <div className="flex items-center gap-2">
                <Button type="button" variant="outline" size="sm" onClick={onClose} className="text-xs h-8">
                  Cancel
                </Button>
                {submitError && (
                  <div className="mb-3 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-300">
                    {submitError}
                  </div>
                )}
                <Button
                  type="submit"
                  size="sm"
                  disabled={isSubmitting}
                  className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white text-xs font-semibold h-8 px-4 shadow-xs"
                >
                  {isSubmitting ? "Sending…" : "Generate & Send Invite"}
                </Button>
              </div>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}
