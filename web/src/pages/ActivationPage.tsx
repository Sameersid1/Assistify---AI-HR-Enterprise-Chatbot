import React, { useState } from "react"
import { useNavigate, useSearchParams, Link } from "react-router-dom"
import { motion } from "framer-motion"
import {
  Sparkles,
  ShieldCheck,
  Lock,
  Eye,
  EyeOff,
  CheckCircle2,
  ArrowRight,
  Sun,
  Moon,
  Building2,
  User,
  Clock,
  KeyRound,
  Check,
} from "lucide-react"
import { useAuth, type UserRole } from "@/context/AuthContext"
import { useTheme } from "@/context/ThemeContext"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"

export const ActivationPage: React.FC = () => {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { login } = useAuth()
  const { theme, toggleTheme } = useTheme()

  // URL Params or sensible defaults
  const queryToken = searchParams.get("token") || "act_demo_7721"
  const queryEmail = searchParams.get("email") || "arjun.m@nexora.com"
  const queryRole = (searchParams.get("role") as UserRole) || "employee"
  const queryName = searchParams.get("name") || "Arjun Mehta"

  const [name, setName] = useState(queryName)
  const [email] = useState(queryEmail)
  const [role, setRole] = useState<UserRole>(queryRole)
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [timezone, setTimezone] = useState("Asia/Kolkata (IST +05:30)")
  const [step, setStep] = useState<1 | 2>(1)
  const [isActivating, setIsActivating] = useState(false)
  const [activated, setActivated] = useState(false)

  // Password criteria check
  const hasMinLength = password.length >= 8
  const hasNumber = /\d/.test(password)
  const hasSpecial = /[@$!%*?&#]/.test(password)
  const isMatch = password === confirmPassword && password.length > 0
  const isPasswordValid = hasMinLength && hasNumber && isMatch

  const handleActivate = (e: React.FormEvent) => {
    e.preventDefault()
    if (!isPasswordValid) return

    setIsActivating(true)
    setTimeout(() => {
      setIsActivating(false)
      setActivated(true)
      // Automatically login into the context
      login(email, role)
    }, 1200)
  }

  const handleQuickDemoRole = (demoRole: UserRole, demoName: string, demoEmail: string) => {
    setRole(demoRole)
    setName(demoName)
  }

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
            <span className="text-[10px] text-zinc-400 font-mono leading-none">
              Nexora Technologies
            </span>
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
                  Welcome to Nexora Technologies
                </p>
              </div>
            </div>

            <Badge variant="active" className="text-xs font-mono font-bold uppercase tracking-wider py-1 px-2.5">
              {role.replace("_", " ")}
            </Badge>
          </div>

          {/* Card Body */}
          {activated ? (
            <div className="p-8 text-center space-y-6">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-100 dark:bg-emerald-950/70 text-emerald-600 dark:text-emerald-400 shadow-xs">
                <CheckCircle2 className="h-9 w-9" />
              </div>

              <div className="space-y-1.5">
                <h2 className="text-xl font-extrabold text-zinc-900 dark:text-zinc-50">
                  Account Activated!
                </h2>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 max-w-sm mx-auto">
                  Your credentials have been securely stored in the SOC-2 encrypted identity vault. You're ready to explore Assistify.
                </p>
              </div>

              <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 p-4 text-xs space-y-2 text-left">
                <div className="flex justify-between text-zinc-600 dark:text-zinc-400">
                  <span>Authorized User:</span>
                  <strong className="text-zinc-900 dark:text-zinc-100">{name}</strong>
                </div>
                <div className="flex justify-between text-zinc-600 dark:text-zinc-400">
                  <span>Work Email:</span>
                  <span className="font-mono text-zinc-800 dark:text-zinc-200">{email}</span>
                </div>
                <div className="flex justify-between text-zinc-600 dark:text-zinc-400">
                  <span>System Role:</span>
                  <Badge variant="active" className="text-[10px] uppercase font-mono">{role}</Badge>
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
            <form onSubmit={handleActivate} className="p-6 md:p-8 space-y-5 text-xs">
              {/* Token & Inviter Badge */}
              <div className="rounded-xl border border-indigo-100 dark:border-indigo-900/50 bg-indigo-50/60 dark:bg-indigo-950/30 p-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                  <span className="text-xs font-semibold text-zinc-800 dark:text-zinc-200">
                    Verified Invitation Token
                  </span>
                </div>
                <span className="font-mono text-[11px] text-indigo-600 dark:text-indigo-400 font-bold">
                  {queryToken}
                </span>
              </div>

              {/* Step 1: User & Work details */}
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
                        value={name}
                        onChange={(e) => setName(e.target.value)}
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
                        <option value="Asia/Kolkata (IST +05:30)">Asia/Kolkata (IST +05:30)</option>
                        <option value="America/New_York (EST -05:00)">America/New_York (EST -05:00)</option>
                        <option value="Europe/London (GMT +00:00)">Europe/London (GMT +00:00)</option>
                        <option value="Asia/Singapore (SGT +08:00)">Asia/Singapore (SGT +08:00)</option>
                      </select>
                    </div>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="font-semibold text-zinc-700 dark:text-zinc-300">
                    Work Email (Locked)
                  </label>
                  <Input
                    readOnly
                    disabled
                    value={email}
                    className="h-9 text-xs font-mono bg-zinc-100 dark:bg-zinc-800/80 text-zinc-500 cursor-not-allowed"
                  />
                </div>
              </div>

              {/* Step 2: Password Creation */}
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

                {/* Password Strength Checklist */}
                <div className="grid grid-cols-3 gap-2 pt-1 text-[11px]">
                  <div className={`flex items-center gap-1.5 font-medium ${hasMinLength ? "text-emerald-600 dark:text-emerald-400" : "text-zinc-400"}`}>
                    <Check className={`h-3.5 w-3.5 ${hasMinLength ? "opacity-100" : "opacity-30"}`} />
                    <span>8+ characters</span>
                  </div>
                  <div className={`flex items-center gap-1.5 font-medium ${hasNumber ? "text-emerald-600 dark:text-emerald-400" : "text-zinc-400"}`}>
                    <Check className={`h-3.5 w-3.5 ${hasNumber ? "opacity-100" : "opacity-30"}`} />
                    <span>Contains number</span>
                  </div>
                  <div className={`flex items-center gap-1.5 font-medium ${isMatch ? "text-emerald-600 dark:text-emerald-400" : "text-zinc-400"}`}>
                    <Check className={`h-3.5 w-3.5 ${isMatch ? "opacity-100" : "opacity-30"}`} />
                    <span>Passwords match</span>
                  </div>
                </div>
              </div>

              {/* Submit Button */}
              <div className="pt-3">
                <Button
                  type="submit"
                  disabled={!isPasswordValid || isActivating}
                  className="w-full h-10 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-xs gap-2"
                >
                  {isActivating ? (
                    <span>Encrypting & Activating...</span>
                  ) : (
                    <>
                      <span>Complete Account Setup & Activate</span>
                      <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                </Button>
              </div>
            </form>
          )}

          {/* Quick Demo Switcher Footer */}
          <div className="bg-zinc-50 dark:bg-zinc-950 px-6 py-3 border-t border-zinc-200/80 dark:border-zinc-800 flex items-center justify-between text-[11px] text-zinc-500">
            <span className="font-medium">Test Activation Preset:</span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => handleQuickDemoRole("employee", "Arjun Mehta", "arjun@nexora.com")}
                className={`px-2 py-0.5 rounded font-semibold ${role === "employee" ? "bg-indigo-600 text-white" : "hover:text-zinc-800 dark:hover:text-zinc-200"}`}
              >
                Employee
              </button>
              <button
                type="button"
                onClick={() => handleQuickDemoRole("hr", "Priya Sharma", "priya@nexora.com")}
                className={`px-2 py-0.5 rounded font-semibold ${role === "hr" ? "bg-amber-500 text-white" : "hover:text-zinc-800 dark:hover:text-zinc-200"}`}
              >
                HR Manager
              </button>
              <button
                type="button"
                onClick={() => handleQuickDemoRole("admin", "Vikram Malhotra", "admin@nexora.com")}
                className={`px-2 py-0.5 rounded font-semibold ${role === "admin" ? "bg-zinc-800 text-white dark:bg-zinc-200 dark:text-zinc-900" : "hover:text-zinc-800 dark:hover:text-zinc-200"}`}
              >
                Admin
              </button>
            </div>
          </div>
        </motion.div>
      </main>

      {/* Footer */}
      <footer className="py-4 text-center text-xs text-zinc-400">
        &copy; 2026 Nexora Technologies · Powered by Assistify AI Portal
      </footer>
    </div>
  )
}
