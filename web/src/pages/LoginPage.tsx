import React, { useState } from "react"
import { useNavigate, Link } from "react-router-dom"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { motion } from "framer-motion"
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
  ArrowRight,
} from "lucide-react"
import { useAuth } from "@/context/AuthContext"
import { useTheme } from "@/context/ThemeContext"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Alert, AlertDescription } from "@/components/ui/alert"

const loginSchema = z.object({
  email: z.string().min(1, "Email is required").email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
})

type LoginFormValues = z.infer<typeof loginSchema>

interface DemoPersona {
  name: string
  email: string
  role: string
  initials: string
}

/** Must match server/src/scripts/seed.ts — only these accounts actually exist. */
const DEMO_PASSWORD = "Password123!"

const DEMO_PERSONAS: DemoPersona[] = [
  { name: "Priya Sharma", email: "hr@nexora.com", role: "HR", initials: "PS" },
  { name: "Arjun Mehta", email: "employee@nexora.com", role: "Employee", initials: "AM" },
]

export const LoginPage: React.FC = () => {
  const navigate = useNavigate()
  const { login } = useAuth()
  const { theme, toggleTheme } = useTheme()
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [activePersonaEmail, setActivePersonaEmail] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  })

  const onSubmit = async (data: LoginFormValues) => {
    setIsLoading(true)
    setErrorMessage(null)
    try {
      const res = await login(data.email, data.password)
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

  const selectPersona = (p: DemoPersona) => {
    setActivePersonaEmail(p.email)
    setValue("email", p.email)
    setValue("password", DEMO_PASSWORD)
    setErrorMessage(null)
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
              Sign in to your Assistify workspace
            </p>
          </div>

          {/* 1-Click Persona Selector Pills */}
          <div className="grid grid-cols-2 gap-1.5 p-1.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-2xs">
            {DEMO_PERSONAS.map((p) => {
              const isSelected = activePersonaEmail === p.email
              return (
                <button
                  key={p.email}
                  type="button"
                  onClick={() => selectPersona(p)}
                  className={`flex items-center gap-2 rounded-lg p-2 text-left transition-all ${
                    isSelected
                      ? "bg-indigo-50 text-indigo-900 dark:bg-indigo-950/60 dark:text-indigo-200 ring-1 ring-indigo-600 font-semibold"
                      : "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
                  }`}
                >
                  <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-zinc-200 dark:bg-zinc-700 text-[10px] font-bold">
                    {p.initials}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[11px] truncate leading-tight">{p.name}</p>
                    <p className="text-[9px] text-zinc-400 truncate">{p.role}</p>
                  </div>
                </button>
              )
            })}
          </div>

          {/* Error Alert */}
          {errorMessage && (
            <Alert variant="destructive" className="py-2 animate-in fade-in-50">
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
                  onClick={() => alert(`Demo password for testing is: ${DEMO_PASSWORD}`)}
                  className="text-[11px] text-indigo-600 dark:text-indigo-400 hover:underline"
                >
                  Forgot?
                </button>
              </div>

              <div className="relative">
                <Input
                  type={showPassword ? "text" : "password"}
                  placeholder=""
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
                    <span>Signing in...</span>
                  </>
                ) : (
                  <span>Sign In</span>
                )}
              </Button>
            </motion.div>
          </form>

          <p className="text-center text-[11px] text-zinc-400">
            Invite-only enterprise access · Your HR team will send you an invitation
          </p>
        </motion.div>

        {/* Bottom copyright */}
        <div className="text-center text-[10px] text-zinc-400">
          Nexora Technologies Inc. © 2026
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
