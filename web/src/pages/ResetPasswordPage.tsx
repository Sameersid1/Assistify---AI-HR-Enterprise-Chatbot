import React, { useState } from "react"
import { Link, useNavigate, useSearchParams } from "react-router-dom"
import { KeyRound, Loader2, AlertCircle, CheckCircle2, ArrowLeft, MailCheck } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { api, ApiError } from "@/lib/api"

/**
 * Two screens in one route.
 *
 * With no `?token=`, this asks for an email address and sends a link. With one,
 * it asks for a new password. Keeping them together means the "check your
 * inbox" message and the form it leads to cannot drift apart in wording.
 *
 * ⚠️ The request step ALWAYS reports success, whatever address is typed. The
 * server behaves the same way and for the same reason: telling someone whether
 * an address has an account here lets them find out who works at this company.
 */
export const ResetPasswordPage: React.FC = () => {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const token = params.get("token")

  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirm, setConfirm] = useState("")
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sent, setSent] = useState(false)
  const [done, setDone] = useState(false)

  const requestLink = async (e: React.FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setError(null)
    try {
      await api.post("/auth/forgot-password", { email: email.trim() }, { public: true })
      setSent(true)
    } catch (err) {
      // Only a transport failure can land here — an unknown address still 200s.
      setError(err instanceof ApiError ? err.message : "Could not send the email. Try again.")
    } finally {
      setBusy(false)
    }
  }

  const setNewPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    if (password !== confirm) {
      setError("The two passwords do not match.")
      return
    }
    setBusy(true)
    setError(null)
    try {
      await api.post("/auth/reset-password", { token, password }, { public: true })
      setDone(true)
      // Signing in is deliberately not automatic — see resetPassword on the
      // server. Give them a moment to read the confirmation.
      setTimeout(() => navigate("/login"), 2500)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not reset your password.")
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="min-h-screen w-full bg-zinc-50 dark:bg-zinc-950 flex items-center justify-center p-6">
      <div className="w-full max-w-sm space-y-6">
        <div className="flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-600 text-white text-xs font-bold">
            A
          </span>
          <span className="text-sm font-bold text-zinc-900 dark:text-zinc-100">Assistify</span>
        </div>

        {done ? (
          <div className="space-y-3">
            <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
              Password updated
            </h1>
            <Alert className="py-2.5">
              <CheckCircle2 className="h-4 w-4" />
              <AlertDescription className="text-xs">
                Sign in with your new password. Taking you there now.
              </AlertDescription>
            </Alert>
          </div>
        ) : sent ? (
          <div className="space-y-3">
            <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
              Check your inbox
            </h1>
            <Alert className="py-2.5">
              <MailCheck className="h-4 w-4" />
              <AlertDescription className="text-xs">
                If that address has an account, a reset link is on its way. It works
                once and expires in an hour.
              </AlertDescription>
            </Alert>
            <p className="text-xs text-zinc-500">
              Nothing arrived? Check spam, or ask HR — they can send you a fresh
              activation link instead.
            </p>
            <Link
              to="/login"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Back to sign in
            </Link>
          </div>
        ) : token ? (
          <form onSubmit={setNewPassword} className="space-y-4">
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
                Choose a new password
              </h1>
              <p className="text-xs text-zinc-500 mt-1">
                At least 8 characters, with a letter and a number.
              </p>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
                New password
              </label>
              <Input
                required
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="new-password"
                className="h-9 text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
                Confirm new password
              </label>
              <Input
                required
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                autoComplete="new-password"
                className="h-9 text-xs"
              />
            </div>

            {error && (
              <Alert variant="destructive" className="py-2">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription className="text-[11px]">{error}</AlertDescription>
              </Alert>
            )}

            <Button
              type="submit"
              disabled={busy || !password || !confirm}
              className="w-full h-9 gap-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white text-xs"
            >
              {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <KeyRound className="h-3.5 w-3.5" />}
              Set new password
            </Button>
          </form>
        ) : (
          <form onSubmit={requestLink} className="space-y-4">
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
                Forgot your password?
              </h1>
              <p className="text-xs text-zinc-500 mt-1">
                Enter your work email and we will send you a link to set a new one.
              </p>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
                Work email
              </label>
              <Input
                required
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@company.com"
                autoComplete="email"
                className="h-9 text-xs"
              />
            </div>

            {error && (
              <Alert variant="destructive" className="py-2">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription className="text-[11px]">{error}</AlertDescription>
              </Alert>
            )}

            <Button
              type="submit"
              disabled={busy || !email.trim()}
              className="w-full h-9 gap-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white text-xs"
            >
              {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
              Send reset link
            </Button>

            <Link
              to="/login"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Back to sign in
            </Link>
          </form>
        )}
      </div>
    </div>
  )
}
