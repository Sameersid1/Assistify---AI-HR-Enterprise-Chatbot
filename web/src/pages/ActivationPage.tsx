import React, { useEffect, useState } from "react"
import { useNavigate, useSearchParams, useParams, Link } from "react-router-dom"
import { motion } from "framer-motion"
import {
  Sparkles,
  ShieldCheck,
  ShieldAlert,
  Lock,
  Eye,
  EyeOff,
  CheckCircle2,
  ArrowRight,
  Sun,
  Moon,
  User,
  Clock,
  KeyRound,
  Check,
  Loader2,
  AlertCircle,
} from "lucide-react"
import { useAuth } from "@/context/AuthContext"
import { useTheme } from "@/context/ThemeContext"
import { api, ApiError } from "@/lib/api"
import type { ActivateResponse, InvitationInfo } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"

/** value = IANA zone (what the server stores); label = what a human reads. */
const TIMEZONES = [
  { value: "Asia/Kolkata", label: "Asia/Kolkata (IST +05:30)" },
  { value: "America/New_York", label: "America/New_York (EST −05:00)" },
  { value: "Europe/London", label: "Europe/London (GMT +00:00)" },
  { value: "Asia/Singapore", label: "Asia/Singapore (SGT +08:00)" },
  { value: "Asia/Dubai", label: "Asia/Dubai (GST +04:00)" },
]

export const ActivationPage: React.FC = () => {
  const [searchParams] = useSearchParams()
  const params = useParams()
  const navigate = useNavigate()
  const { adoptSession } = useAuth()
  const { theme, toggleTheme } = useTheme()

  // The server always builds /activate?token=<hex>; /activate/:token is an alias.
  const token = searchParams.get("token") ?? params.token ?? ""

  // The invitation is the source of truth for identity. Nothing about who this
  // person is comes from the URL any more — a query param is caller-controlled,
  // and role in particular must never be.
  const [invitation, setInvitation] = useState<InvitationInfo | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [isChecking, setIsChecking] = useState(true)

  const [fullName, setFullName] = useState("")
  const [timezone, setTimezone] = useState(
    // Pre-select the browser's own zone when we offer it.
    () => {
      const local = Intl.DateTimeFormat().resolvedOptions().timeZone
      return TIMEZONES.some((t) => t.value === local) ? local : "Asia/Kolkata"
    },
  )
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [isActivating, setIsActivating] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [activated, setActivated] = useState(false)

  // Validate the token before showing the form. Asking someone to choose a
  // password and only then telling them the link expired is a bad trade.
  useEffect(() => {
    let cancelled = false

    async function check() {
      if (!token) {
        setLoadError("This activation link is missing its token. Ask HR to resend the invitation.")
        setIsChecking(false)
        return
      }
      try {
        const info = await api.publicGet<InvitationInfo>(
          `/auth/invitation/${encodeURIComponent(token)}`,
        )
        if (cancelled) return
        setInvitation(info)
        setFullName(info.fullName)
      } catch (err) {
        if (cancelled) return
        setLoadError(
          err instanceof ApiError
            ? err.code === "NETWORK_ERROR"
              ? err.message
              : "This invitation link is invalid, already used, or expired. Ask your HR team to send a new one."
            : "Something went wrong checking this invitation.",
        )
      } finally {
        if (!cancelled) setIsChecking(false)
      }
    }

    void check()
    return () => {
      cancelled = true
    }
  }, [token])

  // Mirrors the server's rules in auth.schema.ts (passwordRules).
  const hasMinLength = password.length >= 8
  const hasNumber = /\d/.test(password)
  const hasLetter = /[A-Za-z]/.test(password)
  const isMatch = password === confirmPassword && password.length > 0
  const isPasswordValid = hasMinLength && hasNumber && hasLetter && isMatch

  const handleActivate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!isPasswordValid || isActivating) return

    setIsActivating(true)
    setSubmitError(null)
    try {
      const data = await api.publicPost<ActivateResponse>("/auth/activate", {
        token,
        password,
        timezone,
        fullName: fullName.trim(),
      })
      // Activation returns real tokens — go straight into the app.
      adoptSession(data)
      setActivated(true)
    } catch (err) {
      setSubmitError(
        err instanceof ApiError ? err.message : "Activation failed. Please try again.",
      )
    } finally {
      setIsActivating(false)
    }
  }

  const companyName = invitation?.companyName || "Assistify"
  const role = invitation?.role ?? "employee"

  return (
    <div className="relative min-h-screen flex flex-col justify-between bg-zinc-50 dark:bg-zinc-950 font-sans text-zinc-900 dark:text-zinc-100 selection:bg-indigo-500 selection:text-white">
      {/* Top Header */}
      <header className="flex h-16 items-center justify-between px-6 md:px-10 border-b border-zinc-200/80 dark:border-zinc-800/80 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md">
        <Link to="/" className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600 text-white shadow-xs">
            <Sparkles className="h-4.5 w-4.5" />
          </div>
          <div className="flex flex-col">
            <span className="text-base font-bold tracking-tight text-zinc-900 dark:text-white">
              Assistify
            </span>
            <span className="text-[10px] text-zinc-400 font-mono leading-none">{companyName}</span>
          </div>
        </Link>

        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="icon-sm"
            onClick={toggleTheme}
            className="h-8.5 w-8.5 rounded-lg border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300"
            title="Toggle theme"
          >
            {theme === "dark" ? <Sun className="h-4 w-4 text-amber-400" /> : <Moon className="h-4 w-4" />}
          </Button>

          <Link to="/login">
            <Button variant="ghost" size="sm" className="text-xs font-semibold text-zinc-600 dark:text-zinc-400">
              Already active? Log in
            </Button>
          </Link>
        </div>
      </header>

      {/* Main Card Container */}
      <main className="flex-1 flex items-center justify-center p-4 md:p-8">
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="w-full max-w-lg rounded-2xl border border-zinc-200/90 dark:border-zinc-800/90 bg-white dark:bg-zinc-900 shadow-xl overflow-hidden"
        >
          {/* Card Banner */}
          <div className="bg-gradient-to-r from-indigo-50 via-white to-purple-50/50 dark:from-indigo-950/40 dark:via-zinc-900 dark:to-purple-950/20 px-6 py-5 border-b border-zinc-200/80 dark:border-zinc-800 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-xs">
                <KeyRound className="h-5 w-5" />
              </div>
              <div>
                <h1 className="text-base font-bold text-zinc-900 dark:text-zinc-50">
                  Account Activation
                </h1>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  {invitation ? `Welcome to ${companyName}` : "Checking your invitation…"}
                </p>
              </div>
            </div>

            {invitation && (
              <Badge
                variant="active"
                className="text-xs font-mono font-bold uppercase tracking-wider py-1 px-2.5"
              >
                {role.replace("_", " ")}
              </Badge>
            )}
          </div>

          {/* ── Checking the token ───────────────────────────────────────── */}
          {isChecking ? (
            <div className="p-12 flex flex-col items-center justify-center gap-3 text-center">
              <Loader2 className="h-6 w-6 animate-spin text-indigo-600" />
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Verifying your invitation link…
              </p>
            </div>
          ) : loadError ? (
            /* ── Bad / expired token ────────────────────────────────────── */
            <div className="p-8 text-center space-y-5">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400">
                <ShieldAlert className="h-7 w-7" />
              </div>
              <div className="space-y-1.5">
                <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-50">
                  This link can't be used
                </h2>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 max-w-sm mx-auto leading-relaxed">
                  {loadError}
                </p>
              </div>
              <div className="flex items-center justify-center gap-2 pt-1">
                <Link to="/login">
                  <Button variant="outline" size="sm" className="text-xs h-9">
                    Go to login
                  </Button>
                </Link>
              </div>
            </div>
          ) : activated ? (
            /* ── Done ───────────────────────────────────────────────────── */
            <div className="p-8 text-center space-y-6">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-100 dark:bg-emerald-950/70 text-emerald-600 dark:text-emerald-400 shadow-xs">
                <CheckCircle2 className="h-9 w-9" />
              </div>

              <div className="space-y-1.5">
                <h2 className="text-xl font-extrabold text-zinc-900 dark:text-zinc-50">
                  Account Activated!
                </h2>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 max-w-sm mx-auto">
                  Your password is set and you're signed in. From now on, sign in with your work
                  email.
                </p>
              </div>

              <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 p-4 text-xs space-y-2 text-left">
                <div className="flex justify-between text-zinc-600 dark:text-zinc-400">
                  <span>Authorized User:</span>
                  <strong className="text-zinc-900 dark:text-zinc-100">{fullName}</strong>
                </div>
                <div className="flex justify-between text-zinc-600 dark:text-zinc-400">
                  <span>Work Email:</span>
                  <span className="font-mono text-zinc-800 dark:text-zinc-200">
                    {invitation?.email}
                  </span>
                </div>
                <div className="flex justify-between text-zinc-600 dark:text-zinc-400">
                  <span>System Role:</span>
                  <Badge variant="active" className="text-[10px] uppercase font-mono">
                    {role}
                  </Badge>
                </div>
              </div>

              <Button
                onClick={() => navigate("/app")}
                className="w-full h-10 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm rounded-xl shadow-xs gap-2"
              >
                <span>Launch Assistify Dashboard</span>
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            /* ── The form ───────────────────────────────────────────────── */
            <form onSubmit={handleActivate} className="p-6 md:p-8 space-y-5 text-xs">
              {/* Token verified badge */}
              <div className="rounded-xl border border-indigo-100 dark:border-indigo-900/50 bg-indigo-50/60 dark:bg-indigo-950/30 p-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                  <span className="text-xs font-semibold text-zinc-800 dark:text-zinc-200">
                    Verified Invitation Token
                  </span>
                </div>
                <span className="font-mono text-[11px] text-indigo-600 dark:text-indigo-400 font-bold">
                  {token.slice(0, 10)}…
                </span>
              </div>

              {/* Identity */}
              <div className="space-y-3.5">
                <div className="grid grid-cols-2 gap-3.5">
                  <div className="space-y-1.5">
                    <label className="font-semibold text-zinc-700 dark:text-zinc-300">
                      Full Name
                    </label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-400" />
                      <Input
                        required
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        className="h-9 pl-9 text-xs"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="font-semibold text-zinc-700 dark:text-zinc-300">
                      Timezone
                    </label>
                    <div className="relative">
                      <Clock className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-400" />
                      <select
                        value={timezone}
                        onChange={(e) => setTimezone(e.target.value)}
                        className="w-full rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 py-2 pl-9 pr-3 text-xs text-zinc-900 dark:text-zinc-100"
                      >
                        {TIMEZONES.map((tz) => (
                          <option key={tz.value} value={tz.value}>
                            {tz.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div className="space-y-1.5">
                    <label className="font-semibold text-zinc-700 dark:text-zinc-300">
                      Work Email (Identity)
                    </label>
                    <Input
                      readOnly
                      disabled
                      value={invitation?.email ?? ""}
                      className="h-9 text-xs font-mono bg-zinc-100 dark:bg-zinc-800/80 text-zinc-500 cursor-not-allowed"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="font-semibold text-zinc-700 dark:text-zinc-300">
                      Invite Sent To
                    </label>
                    <Input
                      readOnly
                      disabled
                      value={invitation?.invitationSentTo ?? ""}
                      className="h-9 text-xs font-mono bg-zinc-100 dark:bg-zinc-800/80 text-zinc-500 cursor-not-allowed"
                    />
                  </div>
                </div>
              </div>

              {/* Password */}
              <div className="space-y-3.5 pt-2 border-t border-zinc-100 dark:border-zinc-800">
                <div className="space-y-1.5">
                  <label className="font-semibold text-zinc-700 dark:text-zinc-300">
                    Create Password
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-400" />
                    <Input
                      required
                      type={showPassword ? "text" : "password"}
                      placeholder="At least 8 characters..."
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="h-9 pl-9 pr-10 text-xs"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600"
                    >
                      {showPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                    </button>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="font-semibold text-zinc-700 dark:text-zinc-300">
                    Confirm Password
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-400" />
                    <Input
                      required
                      type={showPassword ? "text" : "password"}
                      placeholder="Repeat your password..."
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="h-9 pl-9 text-xs"
                    />
                  </div>
                </div>

                {/* Rules — these mirror the server, so a green tick means it will pass. */}
                <div className="grid grid-cols-3 gap-2 pt-1 text-[11px]">
                  <div className={`flex items-center gap-1.5 font-medium ${hasMinLength ? "text-emerald-600 dark:text-emerald-400" : "text-zinc-400"}`}>
                    <Check className={`h-3.5 w-3.5 ${hasMinLength ? "opacity-100" : "opacity-30"}`} />
                    <span>8+ characters</span>
                  </div>
                  <div className={`flex items-center gap-1.5 font-medium ${hasNumber && hasLetter ? "text-emerald-600 dark:text-emerald-400" : "text-zinc-400"}`}>
                    <Check className={`h-3.5 w-3.5 ${hasNumber && hasLetter ? "opacity-100" : "opacity-30"}`} />
                    <span>Letter + number</span>
                  </div>
                  <div className={`flex items-center gap-1.5 font-medium ${isMatch ? "text-emerald-600 dark:text-emerald-400" : "text-zinc-400"}`}>
                    <Check className={`h-3.5 w-3.5 ${isMatch ? "opacity-100" : "opacity-30"}`} />
                    <span>Passwords match</span>
                  </div>
                </div>
              </div>

              {submitError && (
                <div className="flex items-start gap-2 rounded-lg border border-rose-200 dark:border-rose-900/60 bg-rose-50 dark:bg-rose-950/40 p-2.5 text-[11px] text-rose-700 dark:text-rose-300">
                  <AlertCircle className="h-3.5 w-3.5 shrink-0 mt-px" />
                  <span>{submitError}</span>
                </div>
              )}

              <div className="pt-1">
                <Button
                  type="submit"
                  disabled={!isPasswordValid || isActivating}
                  className="w-full h-10 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-xs gap-2"
                >
                  {isActivating ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Activating…</span>
                    </>
                  ) : (
                    <>
                      <span>Complete Account Setup &amp; Activate</span>
                      <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                </Button>
              </div>
            </form>
          )}
        </motion.div>
      </main>

      <footer className="py-4 text-center text-xs text-zinc-400">
        &copy; 2026 {companyName} · Powered by Assistify
      </footer>
    </div>
  )
}
