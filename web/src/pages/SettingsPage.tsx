import React, { useState } from "react"
import {
  KeyRound,
  UserRound,
  Moon,
  Sun,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Eye,
  EyeOff,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { api, ApiError } from "@/lib/api"
import { useAuth } from "@/context/AuthContext"
import { useTheme } from "@/context/ThemeContext"
import { EMPLOYMENT_TYPE_LABELS, type EmploymentType } from "@/lib/types"

/**
 * Settings.
 *
 * Only things that actually do something. There is no notification-preferences
 * block, no language picker and no "profile photo" — every one of those would
 * be a control that changes nothing, which is worse than not having the screen.
 * Your details are shown but not editable: name, department and employment type
 * are HR's record of you, and letting people rewrite their own employment type
 * would change which policies their assistant reads.
 */

const ROLE_LABELS: Record<string, string> = {
  employee: "Employee",
  hr: "HR",
  it_support: "IT Support",
  admin: "Administrator",
  super_admin: "Super Administrator",
}

const Section: React.FC<{
  icon: React.ElementType
  title: string
  description: string
  children: React.ReactNode
}> = ({ icon: Icon, title, description, children }) => (
  <section className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5 space-y-4">
    <div className="flex items-start gap-3">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400">
        <Icon className="h-4 w-4" />
      </div>
      <div>
        <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">{title}</h2>
        <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">{description}</p>
      </div>
    </div>
    {children}
  </section>
)

const Field: React.FC<{ label: string; value?: React.ReactNode }> = ({ label, value }) => (
  <div className="flex items-baseline justify-between gap-4 border-b border-zinc-100 dark:border-zinc-800 py-2 last:border-0">
    <span className="text-xs text-zinc-500 dark:text-zinc-400">{label}</span>
    <span className="text-xs font-medium text-zinc-900 dark:text-zinc-100 text-right">
      {value ?? "—"}
    </span>
  </div>
)

export const SettingsPage: React.FC = () => {
  const { user } = useAuth()
  const { theme, toggleTheme } = useTheme()

  const [current, setCurrent] = useState("")
  const [next, setNext] = useState("")
  const [confirm, setConfirm] = useState("")
  const [show, setShow] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState<string | null>(null)

  const changePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setDone(null)

    // Checked here as well as on the server so the person is told immediately
    // rather than after a round trip.
    if (next !== confirm) {
      setError("The two new passwords do not match.")
      return
    }

    setSaving(true)
    try {
      await api.post("/auth/change-password", { currentPassword: current, newPassword: next })
      setCurrent("")
      setNext("")
      setConfirm("")
      setDone("Password changed. Your other devices have been signed out.")
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Could not change your password. Try again.",
      )
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
          Settings
        </h1>
        <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
          Your account, and how this app looks.
        </p>
      </div>

      <Section
        icon={UserRound}
        title="Your details"
        description="Held by HR. Ask them to change anything that is wrong."
      >
        <div>
          <Field label="Name" value={user?.name} />
          <Field label="Work email" value={user?.email} />
          <Field label="Company" value={user?.company} />
          <Field
            label="Access level"
            value={
              <Badge variant="outline" className="text-[10px] py-0 px-1.5">
                {ROLE_LABELS[user?.role ?? ""] ?? user?.role}
              </Badge>
            }
          />
          {user?.employmentType && (
            <Field
              label="Employment type"
              value={EMPLOYMENT_TYPE_LABELS[user.employmentType as EmploymentType]}
            />
          )}
          {user?.department && <Field label="Department" value={user.department} />}
          {user?.designation && <Field label="Job title" value={user.designation} />}
        </div>
        <p className="text-[11px] text-zinc-400">
          Your employment type decides your leave entitlement and which policy documents
          the assistant answers you from, which is why it is not editable here.
        </p>
      </Section>

      <Section
        icon={KeyRound}
        title="Change password"
        description="You need your current password, even though you are signed in."
      >
        <form onSubmit={changePassword} className="space-y-3">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
              Current password
            </label>
            <Input
              required
              type="password"
              value={current}
              onChange={(e) => setCurrent(e.target.value)}
              autoComplete="current-password"
              className="h-9 text-xs"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
                New password
              </label>
              <div className="relative">
                <Input
                  required
                  type={show ? "text" : "password"}
                  value={next}
                  onChange={(e) => setNext(e.target.value)}
                  autoComplete="new-password"
                  className="h-9 pr-9 text-xs"
                />
                <button
                  type="button"
                  onClick={() => setShow((v) => !v)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600"
                  tabIndex={-1}
                  aria-label={show ? "Hide password" : "Show password"}
                >
                  {show ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                </button>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
                Confirm new password
              </label>
              <Input
                required
                type={show ? "text" : "password"}
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                autoComplete="new-password"
                className="h-9 text-xs"
              />
            </div>
          </div>

          <p className="text-[11px] text-zinc-400">
            At least 8 characters, with a letter and a number.
          </p>

          {error && (
            <Alert variant="destructive" className="py-2">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="text-[11px]">{error}</AlertDescription>
            </Alert>
          )}
          {done && (
            <Alert className="py-2">
              <CheckCircle2 className="h-4 w-4" />
              <AlertDescription className="text-[11px]">{done}</AlertDescription>
            </Alert>
          )}

          <Button
            type="submit"
            size="sm"
            disabled={saving || !current || !next || !confirm}
            className="gap-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white text-xs"
          >
            {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <KeyRound className="h-3.5 w-3.5" />}
            Change password
          </Button>
        </form>
      </Section>

      <Section
        icon={theme === "dark" ? Moon : Sun}
        title="Appearance"
        description="Remembered on this device."
      >
        <div className="flex items-center justify-between">
          <span className="text-xs text-zinc-600 dark:text-zinc-400">
            Currently using the {theme === "dark" ? "dark" : "light"} theme.
          </span>
          <Button variant="outline" size="sm" onClick={toggleTheme} className="gap-1.5 text-xs h-8">
            {theme === "dark" ? <Sun className="h-3.5 w-3.5" /> : <Moon className="h-3.5 w-3.5" />}
            Switch to {theme === "dark" ? "light" : "dark"}
          </Button>
        </div>
      </Section>
    </div>
  )
}
