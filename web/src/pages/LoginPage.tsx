import React, { useState } from "react"
import { useNavigate, Link } from "react-router-dom"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { motion, AnimatePresence } from "framer-motion"
import {
  Sparkles,
  Loader2,
  AlertCircle,
  ShieldCheck,
  Sun,
  Moon,
  Eye,
  EyeOff,
  Quote,
  Lock,
  User,
  Users,
  Shield,
  Headphones,
  ArrowRight,
  CheckCircle2,
} from "lucide-react"
import { useAuth } from "@/context/AuthContext"
import type { UserRole } from "@/lib/types"
import { useTheme } from "@/context/ThemeContext"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Alert, AlertDescription } from "@/components/ui/alert"

const loginSchema = z.object({
  email: z.string().min(1, "Email is required").email("Please enter a valid email address"),
  password: z.string().min(1, "Password is required"),
})

type LoginFormValues = z.infer<typeof loginSchema>

/**
 * Sign-in portals.
 *
 * `roles` is what makes the selection mean something: the chosen portal's list
 * is handed to login(), which rejects the attempt when the authenticated
 * account's role is not in it. The check is a routing convenience rather than a
 * security boundary — authority comes from the role the server writes into the
 * token — but it turns a wrong pick into a clear message instead of a dashboard
 * missing everything the portal advertises.
 *
 * Every role must appear in some portal's `roles`, or accounts of that role can
 * never sign in. super_admin rides with admin because it sees the same surface.
 * Adding a portal is one entry here; nothing else needs to change.
 *
 * `demoEmail` prefills the form on selection in development only. It used to
 * run in production too, where it overwrote a real address with a seeded one
 * that no deployed database holds — the attempt then failed as "invalid email
 * or password" and read as a backend fault. MUST match seed.ts; if dev sign-in
 * breaks after a frontend regeneration, CHECK HERE FIRST.
 */
const DEMO_PASSWORD = "Password123!"

interface RolePortal {
  id: string
  label: string
  icon: typeof User
  subtext: string
  roles: readonly UserRole[]
  demoEmail: string
}

const ROLE_PORTALS: readonly RolePortal[] = [
  {
    id: "employee",
    label: "Employee",
    icon: User,
    subtext: "Self-service queries, leave balances & requests",
    roles: ["employee"],
    demoEmail: "employee@nexora.com",
  },
  {
    id: "hr",
    label: "HR Manager",
    icon: Users,
    subtext: "Leave approvals, tickets & workforce analytics",
    roles: ["hr"],
    demoEmail: "hr@nexora.com",
  },
  {
    id: "admin",
    label: "Administrator",
    icon: Shield,
    subtext: "System configurations, RBAC & user directory",
    roles: ["admin", "super_admin"],
    demoEmail: "admin@nexora.com",
  },
  {
    id: "it_support",
    label: "IT Support",
    icon: Headphones,
    subtext: "Hardware requests, access issues & tech tickets",
    roles: ["it_support"],
    demoEmail: "it@nexora.com",
  },
]

export const LoginPage: React.FC = () => {
  const navigate = useNavigate()
  const { login } = useAuth()
  const { theme, toggleTheme } = useTheme()
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [selectedPortal, setSelectedPortal] = useState<RolePortal>(ROLE_PORTALS[0])

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      // Never ship prefilled credentials — DEV only.
      email: import.meta.env.DEV ? "employee@nexora.com" : "",
      password: import.meta.env.DEV ? DEMO_PASSWORD : "",
    },
  })

  const handlePortalSelect = (portal: RolePortal) => {
    setSelectedPortal(portal)
    setErrorMessage(null)
    // Prefill only in development — see the ROLE_PORTALS note on why this must
    // never touch a deployed build.
    if (import.meta.env.DEV) {
      setValue("email", portal.demoEmail)
      setValue("password", DEMO_PASSWORD)
    }
  }

  const onSubmit = async (data: LoginFormValues) => {
    setIsLoading(true)
    setErrorMessage(null)
    try {
      const res = await login(data.email, data.password, selectedPortal.roles)
      if (res.success) {
        navigate("/app")
      } else {
        setErrorMessage(res.error || "Invalid email or password")
      }
    } catch {
      setErrorMessage("Invalid email or password")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen w-full bg-zinc-50 dark:bg-zinc-950 font-sans text-zinc-900 dark:text-zinc-100 flex selection:bg-indigo-600 selection:text-white">
      {/* Left Form Panel (58% on desktop) */}
      <div className="flex w-full flex-col justify-between p-6 sm:p-10 lg:w-[58%]">
        {/* Top Header */}
        <div className="flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 group">
            <motion.div
              whileHover={{ rotate: 10, scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-600 text-white shadow-xs"
            >
              <Sparkles className="h-4 w-4" />
            </motion.div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-sm font-semibold tracking-tight">Assistify</span>
              <span className="text-[10px] font-mono text-zinc-400">Enterprise</span>
            </div>
          </Link>

          <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
            <Button
              variant="outline"
              size="icon-sm"
              onClick={toggleTheme}
              className="h-8 w-8 rounded-lg border-zinc-200 dark:border-zinc-800"
              title="Toggle theme"
            >
              {theme === "dark" ? (
                <Sun className="h-4 w-4 text-amber-400" />
              ) : (
                <Moon className="h-4 w-4 text-zinc-600" />
              )}
            </Button>
          </motion.div>
        </div>

        {/* Form Container */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="mx-auto w-full max-w-sm py-6 space-y-5"
        >
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
              Welcome back
            </h1>
            <p className="text-xs text-zinc-500 mt-1">
              Select your role portal to sign in to your workspace
            </p>
          </div>

          {/* Role portals. The selection is enforced: login() rejects an account
              whose role is not in the chosen portal's `roles`. */}
          <div className="space-y-2">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 p-1 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-2xs">
              {ROLE_PORTALS.map((portal) => {
                const Icon = portal.icon
                const isSelected = selectedPortal.id === portal.id
                return (
                  <button
                    key={portal.id}
                    type="button"
                    onClick={() => handlePortalSelect(portal)}
                    aria-pressed={isSelected}
                    className={`relative flex flex-col items-center justify-center gap-1 py-2 px-1.5 rounded-lg text-xs font-medium transition-all ${
                      isSelected
                        ? "text-indigo-600 dark:text-indigo-400 bg-indigo-50/70 dark:bg-indigo-950/50 shadow-2xs font-semibold"
                        : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200 hover:bg-zinc-50 dark:hover:bg-zinc-800/40"
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    <span className="text-[11px] leading-tight">{portal.label}</span>
                    {isSelected && (
                      <motion.div
                        layoutId="activeRoleIndicator"
                        className="absolute inset-0 border border-indigo-600/40 dark:border-indigo-500/40 rounded-lg pointer-events-none"
                        transition={{ type: "spring", stiffness: 400, damping: 30 }}
                      />
                    )}
                  </button>
                )
              })}
            </div>

            <p className="text-[11px] text-center text-zinc-400">
              {selectedPortal.subtext}
            </p>
          </div>

          {/* Error Alert */}
          {errorMessage && (
            <Alert variant="destructive" className="py-2.5 animate-in fade-in-50">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="text-xs">{errorMessage}</AlertDescription>
            </Alert>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-3.5">
            <div className="space-y-1">
              <label className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
                Work Email
              </label>
              <Input
                type="email"
                placeholder=""
                autoComplete="email"
                disabled={isLoading}
                {...register("email")}
                className="h-9 text-xs"
              />
              {errors.email && (
                <p className="text-[10px] text-rose-600">{errors.email.message}</p>
              )}
            </div>

            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <label className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
                  Password
                </label>
                <button
                  type="button"
                  onClick={() => alert("Please contact your IT/HR administrator for password reset.")}
                  className="text-[11px] text-indigo-600 dark:text-indigo-400 hover:underline"
                >
                  Forgot password?
                </button>
              </div>

              <div className="relative">
                <Input
                  type={showPassword ? "text" : "password"}
                  placeholder=""
                  autoComplete="current-password"
                  disabled={isLoading}
                  {...register("password")}
                  className="h-9 pr-9 text-xs"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {errors.password && (
                <p className="text-[10px] text-rose-600">{errors.password.message}</p>
              )}
            </div>

            <motion.div whileTap={{ scale: 0.98 }}>
              <Button
                type="submit"
                disabled={isLoading}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white h-9 text-xs font-medium rounded-lg shadow-xs"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                    <span>Verifying credentials...</span>
                  </>
                ) : (
                  <span>Sign In as {selectedPortal.label}</span>
                )}
              </Button>
            </motion.div>
          </form>

          {/* Helper info */}
          <div className="pt-2 text-center">
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Don&apos;t have an account? Your HR team will send you an invitation.
            </p>
          </div>
        </motion.div>

        {/* Bottom copyright */}
        <div className="text-center text-[10px] text-zinc-400">
          Nexora Technologies Inc. © 2026 · Confidential & Proprietary
        </div>
      </div>

      {/* Right Panel (42% on desktop) with pull quote, stats, and dot grid */}
      <div className="hidden lg:flex lg:w-[42%] flex-col justify-between bg-zinc-900 p-12 text-white relative overflow-hidden">
        {/* Dot-grid background texture */}
        <div className="absolute inset-0 bg-dot-grid opacity-20 pointer-events-none" />

        {/* Ambient Gradient Glow */}
        <motion.div
          animate={{ opacity: [0.15, 0.3, 0.15], scale: [1, 1.1, 1] }}
          transition={{ repeat: Infinity, duration: 6, ease: "easeInOut" }}
          className="absolute -top-24 -right-24 w-80 h-80 bg-indigo-600/30 rounded-full blur-3xl pointer-events-none"
        />

        {/* Top Security Header */}
        <div className="relative z-10 flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-medium text-zinc-400">
            <ShieldCheck className="h-4 w-4 text-indigo-400" />
            <span>SOC-2 Type II Certified</span>
          </div>
          <span className="rounded-full bg-zinc-800/90 border border-zinc-700 px-2.5 py-0.5 text-[10px] text-zinc-300 font-mono">
            AES 256-bit
          </span>
        </div>

        {/* Center Pull Quote */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="relative z-10 space-y-5 max-w-sm"
        >
          <Quote className="h-8 w-8 text-indigo-400 opacity-60" />
          <blockquote className="text-lg font-medium tracking-tight text-zinc-100 leading-snug">
            &ldquo;Assistify resolved 78% of our repetitive HR questions on day one, freeing our team to focus on strategic people operations.&rdquo;
          </blockquote>
          <div className="space-y-0.5">
            <p className="text-xs font-semibold text-zinc-200">
              Devin Vance
            </p>
            <p className="text-[11px] text-zinc-400">
              VP of People & Culture, Nexora Technologies
            </p>
          </div>
        </motion.div>

        {/* Bottom Metric Stats */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.35 }}
          className="relative z-10 border-t border-zinc-800 pt-6"
        >
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-2xl font-semibold text-indigo-400 tabular-nums">
                &lt; 2.4s
              </p>
              <p className="text-[11px] text-zinc-400">Average response time</p>
            </div>
            <div>
              <p className="text-2xl font-semibold text-emerald-400 tabular-nums">
                99.4%
              </p>
              <p className="text-[11px] text-zinc-400">Policy retrieval accuracy</p>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  )
}
