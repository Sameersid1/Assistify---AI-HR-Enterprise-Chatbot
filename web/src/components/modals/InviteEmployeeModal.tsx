import React, { useState } from "react"
import { UserPlus, Copy, Check, Send, AlertCircle, Mail, Loader2 } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { api, ApiError } from "@/lib/api"
import {
  EMPLOYMENT_TYPES,
  EMPLOYMENT_TYPE_LABELS,
  type EmploymentType,
  type InviteRequest,
  type InviteResponse,
} from "@/lib/types"

/**
 * Invite an employee.
 *
 * This existed nowhere. The only invite form lived on User Management, which is
 * admin-only and offers HR / IT Support / Administrator — and the server's
 * role-creation whitelist says an admin may NOT create an employee. HR may, and
 * had no screen to do it from, so the only employees in the system were the
 * ones a seed script had written. In a product whose entire subject is
 * employees, they could not be added.
 *
 * Kept separate from InviteStaffModal rather than merged into it. That one is
 * about granting elevated access and is built around picking a privilege tier;
 * this one has no tier to pick — the role is always `employee` — and instead
 * needs the details that make a person findable in the directory.
 */

interface Props {
  isOpen: boolean
  onClose: () => void
  onInvited: () => void
}

export const InviteEmployeeModal: React.FC<Props> = ({ isOpen, onClose, onInvited }) => {
  const [form, setForm] = useState({
    fullName: "",
    email: "",
    personalEmail: "",
    department: "",
    designation: "",
    employmentType: "FULL_TIME" as EmploymentType,
  })
  const [result, setResult] = useState<InviteResponse | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [copied, setCopied] = useState(false)

  const reset = () => {
    setForm({
      fullName: "",
      email: "",
      personalEmail: "",
      department: "",
      designation: "",
      employmentType: "FULL_TIME",
    })
    setResult(null)
    setError(null)
    setCopied(false)
  }

  const close = () => {
    reset()
    onClose()
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.email.trim() || isSubmitting) return

    setIsSubmitting(true)
    setError(null)
    try {
      const invite = await api.post<InviteResponse>("/users/invite", {
        email: form.email.trim(),
        ...(form.personalEmail.trim() ? { personalEmail: form.personalEmail.trim() } : {}),
        fullName: form.fullName.trim() || form.email.split("@")[0],
        role: "employee",
        employmentType: form.employmentType,
        ...(form.department.trim() ? { department: form.department.trim() } : {}),
        ...(form.designation.trim() ? { designation: form.designation.trim() } : {}),
      } satisfies InviteRequest)

      setResult(invite)
      onInvited()
    } catch (err) {
      setError(
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

  const copyLink = async () => {
    if (!result) return
    await navigator.clipboard.writeText(result.activationUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && close()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600 text-white">
              <UserPlus className="h-4 w-4" />
            </span>
            Invite an Employee
          </DialogTitle>
          <DialogDescription className="text-xs">
            They receive an activation link and set their own password.
          </DialogDescription>
        </DialogHeader>

        {result ? (
          <div className="space-y-3 text-xs">
            <Alert className="py-2.5">
              {result.emailSent ? <Send className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
              <AlertDescription className="text-xs">
                {result.emailSent
                  ? `Invitation sent to ${result.invitationSentTo}.`
                  : `The invitation could not be emailed${result.emailError ? ` (${result.emailError})` : ""}. Send them the link below instead.`}
              </AlertDescription>
            </Alert>

            <div className="space-y-1.5">
              <label className="font-semibold text-zinc-700 dark:text-zinc-300">
                Activation link — shown once
              </label>
              <div className="flex items-center gap-2">
                <Input readOnly value={result.activationUrl} className="h-9 text-[11px] font-mono" />
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => void copyLink()}
                  className="h-9 shrink-0 gap-1.5 text-[11px]"
                >
                  {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                  {copied ? "Copied" : "Copy"}
                </Button>
              </div>
              <p className="text-[11px] text-zinc-400">
                Single-use, and expires in 72 hours.
              </p>
            </div>

            <div className="flex justify-end gap-2 border-t border-zinc-100 dark:border-zinc-800 pt-3">
              <Button type="button" variant="outline" size="sm" onClick={reset} className="text-xs h-8">
                Invite another
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={close}
                className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs h-8"
              >
                Done
              </Button>
            </div>
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-3 text-xs">
            <div className="space-y-1.5">
              <label className="font-semibold text-zinc-700 dark:text-zinc-300">Full name</label>
              <Input
                value={form.fullName}
                onChange={(e) => setForm({ ...form, fullName: e.target.value })}
                placeholder="e.g. Anita Rao"
                className="h-9 text-xs"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="font-semibold text-zinc-700 dark:text-zinc-300">
                  Work email <span className="text-rose-500">*</span>
                </label>
                <Input
                  required
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  placeholder="name@company.com"
                  className="h-9 text-xs"
                />
              </div>
              <div className="space-y-1.5">
                <label className="flex items-center justify-between font-semibold text-zinc-700 dark:text-zinc-300">
                  Personal email
                  <span className="text-[10px] font-normal text-zinc-400">invite goes here</span>
                </label>
                <Input
                  type="email"
                  value={form.personalEmail}
                  onChange={(e) => setForm({ ...form, personalEmail: e.target.value })}
                  placeholder="name@gmail.com"
                  className="h-9 text-xs"
                />
              </div>
            </div>

            {/* The field that decides which policies their assistant can read.
                Called out rather than buried among the optional details, because
                getting it wrong sends someone the wrong rules. */}
            <div className="space-y-1.5 rounded-lg border border-zinc-200 dark:border-zinc-800 p-3">
              <label className="font-semibold text-zinc-700 dark:text-zinc-300">
                Employment type <span className="text-rose-500">*</span>
              </label>
              <div className="flex flex-wrap gap-2">
                {EMPLOYMENT_TYPES.map((type) => {
                  const active = form.employmentType === type
                  return (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setForm({ ...form, employmentType: type })}
                      className={`rounded-md border px-2.5 py-1 text-[11px] transition-colors ${
                        active
                          ? "border-indigo-300 bg-indigo-50 text-indigo-800 dark:border-indigo-800 dark:bg-indigo-950/50 dark:text-indigo-300"
                          : "border-zinc-200 text-zinc-600 hover:border-zinc-300 dark:border-zinc-700 dark:text-zinc-400"
                      }`}
                    >
                      {EMPLOYMENT_TYPE_LABELS[type]}
                    </button>
                  )
                })}
              </div>
              <p className="text-[10px] text-zinc-400">
                Decides their leave entitlement and which policy documents the
                assistant will answer them from.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="font-semibold text-zinc-700 dark:text-zinc-300">Department</label>
                <Input
                  value={form.department}
                  onChange={(e) => setForm({ ...form, department: e.target.value })}
                  placeholder="e.g. Engineering"
                  className="h-9 text-xs"
                />
              </div>
              <div className="space-y-1.5">
                <label className="font-semibold text-zinc-700 dark:text-zinc-300">Job title</label>
                <Input
                  value={form.designation}
                  onChange={(e) => setForm({ ...form, designation: e.target.value })}
                  placeholder="e.g. Backend Engineer"
                  className="h-9 text-xs"
                />
              </div>
            </div>

            {error && (
              <Alert variant="destructive" className="py-2">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription className="text-[11px]">{error}</AlertDescription>
              </Alert>
            )}

            <div className="flex items-center justify-between border-t border-zinc-100 dark:border-zinc-800 pt-3">
              <span className="inline-flex items-center gap-1.5 text-[11px] text-zinc-400">
                <Mail className="h-3 w-3" />
                Sent to their personal email if given, otherwise their work email.
              </span>
              <div className="flex items-center gap-2">
                <Button type="button" variant="outline" size="sm" onClick={close} className="text-xs h-8">
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={isSubmitting || !form.email.trim()}
                  className="gap-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white text-xs h-8"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      Sending…
                    </>
                  ) : (
                    <>
                      <Send className="h-3.5 w-3.5" />
                      Send Invitation
                    </>
                  )}
                </Button>
              </div>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}
