import React, { useState, useEffect } from "react"
import { Link, useNavigate } from "react-router-dom"
import { motion, AnimatePresence } from "framer-motion"
import {
  Sparkles,
  BookOpen,
  Database,
  Zap,
  ArrowRight,
  ShieldCheck,
  Calendar,
  Sun,
  Moon,
  Bot,
  User,
  CheckCircle2,
  FileText,
  Clock,
  Send,
  Lock,
  ChevronRight,
  TrendingUp,
  Award,
  Layers,
} from "lucide-react"
import { useTheme } from "@/context/ThemeContext"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"

interface DemoQuery {
  id: string
  icon: typeof Calendar
  label: string
  query: string
  answer: string
  doc: string
  metric: string
}

const DEMO_QUERIES: DemoQuery[] = [
  {
    id: "leave",
    icon: Calendar,
    label: "Leave Balance",
    query: "What is my remaining casual leave balance for Q3?",
    answer: "You currently have 8 casual leaves remaining out of 12 for 2026. Up to 5 unused days can rollover to Q3 with manager approval.",
    doc: "Leave Policy 2026 · §4.2",
    metric: "8 Days Remaining",
  },
  {
    id: "wfh",
    icon: Zap,
    label: "Hybrid & WFH",
    query: "What is our monthly broadband reimbursement policy?",
    answer: "Hybrid employees can claim up to $75/month for high-speed home internet via the Expense portal by the 25th.",
    doc: "Hybrid Work Guidelines · §3.1",
    metric: "$75 / Month",
  },
  {
    id: "health",
    icon: ShieldCheck,
    label: "Medical Benefits",
    query: "What is the insurance coverage limit for family dependents?",
    answer: "Nexora Group Medical covers the employee, spouse, and up to 2 children with an annual aggregate limit of $50,000.",
    doc: "Health Insurance · Schedule A",
    metric: "$50,000 Coverage",
  },
  {
    id: "apply",
    icon: Send,
    label: "1-Click Leave",
    query: "Apply 2-day casual leave for Aug 10 and Aug 11",
    answer: "Drafted leave request #LR-2026-108 for Aug 10–11. Manager Devin Vance notified automatically.",
    doc: "HRMS Workflow #LA-902",
    metric: "Auto-Drafted",
  },
]

export const LandingPage: React.FC = () => {
  const navigate = useNavigate()
  const { theme, toggleTheme } = useTheme()
  const [selectedIdx, setSelectedIdx] = useState(0)
  const activeItem = DEMO_QUERIES[selectedIdx]

  // Auto-cycle demo
  useEffect(() => {
    const timer = setInterval(() => {
      setSelectedIdx((prev) => (prev + 1) % DEMO_QUERIES.length)
    }, 6000)
    return () => clearInterval(timer)
  }, [])

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 flex flex-col font-sans selection:bg-indigo-600 selection:text-white relative overflow-hidden">
      {/* Background Animated Gradient Mesh / Floating Orbs */}
      <motion.div
        animate={{
          scale: [1, 1.15, 1],
          opacity: [0.15, 0.25, 0.15],
          x: [-20, 20, -20],
          y: [-10, 15, -10],
        }}
        transition={{ repeat: Infinity, duration: 8, ease: "easeInOut" }}
        className="absolute -top-32 -left-32 w-[420px] h-[420px] bg-indigo-500/20 dark:bg-indigo-500/25 rounded-full blur-3xl pointer-events-none"
      />
      <motion.div
        animate={{
          scale: [1.1, 1, 1.1],
          opacity: [0.1, 0.2, 0.1],
          x: [20, -20, 20],
          y: [15, -10, 15],
        }}
        transition={{ repeat: Infinity, duration: 10, ease: "easeInOut" }}
        className="absolute top-1/3 -right-32 w-[450px] h-[450px] bg-indigo-600/15 dark:bg-indigo-600/20 rounded-full blur-3xl pointer-events-none"
      />

      {/* Top Navigation */}
      <header className="sticky top-0 z-50 w-full border-b border-zinc-200/80 bg-white/85 backdrop-blur-md dark:border-zinc-800/80 dark:bg-zinc-900/85 transition-colors">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-6">
          <div className="flex items-center gap-2.5">
            <motion.div
              whileHover={{ rotate: 15, scale: 1.08 }}
              whileTap={{ scale: 0.95 }}
              className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-600 text-white shadow-xs"
            >
              <Sparkles className="h-4 w-4" />
            </motion.div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-sm font-semibold tracking-tight">Assistify</span>
              <span className="rounded-md bg-indigo-50 dark:bg-indigo-950/60 px-1.5 py-0.5 text-[10px] font-semibold text-indigo-600 dark:text-indigo-400 font-mono">
                Enterprise
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <Button
                variant="outline"
                size="icon-sm"
                onClick={toggleTheme}
                className="h-8 w-8 rounded-lg border-zinc-200 dark:border-zinc-800 transition-colors"
                title="Toggle theme"
              >
                {theme === "dark" ? (
                  <Sun className="h-4 w-4 text-amber-400" />
                ) : (
                  <Moon className="h-4 w-4 text-zinc-600" />
                )}
              </Button>
            </motion.div>
            <Link to="/login">
              <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
                <Button size="sm" className="h-8 px-4 bg-indigo-600 text-white hover:bg-indigo-700 text-xs font-medium rounded-lg shadow-xs gap-1.5">
                  <span>Sign In</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </Button>
              </motion.div>
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col justify-center max-w-5xl mx-auto w-full px-6 py-8 sm:py-12 space-y-10">
        {/* HERO SECTION: Highly Professional Heading & Staggered Motion */}
        <div className="text-center space-y-4 max-w-3xl mx-auto">
          {/* Animated Announcement Pill */}
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="inline-flex items-center gap-2 rounded-full border border-indigo-200/90 bg-white/90 dark:bg-zinc-900/90 dark:border-indigo-800/80 px-3.5 py-1 shadow-2xs"
          >
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-600" />
            </span>
            <span className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
              Autonomous Policy RAG & Workforce Intelligence
            </span>
            <Sparkles className="h-3 w-3 text-indigo-600 dark:text-indigo-400" />
          </motion.div>

          {/* Main Professional Heading */}
          <motion.h1
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="text-3xl sm:text-5xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50 leading-[1.15]"
          >
            Enterprise People Operations, <br />
            <span className="text-indigo-600 dark:text-indigo-400">Automated with Policy Precision.</span>
          </motion.h1>

          {/* Crisp Subtitle */}
          <motion.p
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="text-sm sm:text-base text-zinc-600 dark:text-zinc-400 max-w-xl mx-auto leading-relaxed"
          >
            Empower employees with instant, verified HR answers, live leave balances, and automated workflow approvals.
          </motion.p>
        </div>

        {/* INTERACTIVE ANIMATED ASSISTANT PREVIEW */}
        <motion.div
          initial={{ opacity: 0, y: 25 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.25 }}
          className="rounded-2xl border border-zinc-200/90 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-lg overflow-hidden"
        >
          {/* Interactive Scenario Tabs with sliding layout indicator */}
          <div className="flex border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50/80 dark:bg-zinc-900/60 p-2 gap-1.5 overflow-x-auto">
            {DEMO_QUERIES.map((item, idx) => {
              const Icon = item.icon
              const isSelected = selectedIdx === idx
              return (
                <button
                  key={item.id}
                  onClick={() => setSelectedIdx(idx)}
                  className={`relative flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
                    isSelected
                      ? "text-indigo-600 dark:text-indigo-400 bg-white dark:bg-zinc-800 shadow-xs"
                      : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200"
                  }`}
                >
                  <Icon className="h-3.5 w-3.5 shrink-0" />
                  <span className="whitespace-nowrap">{item.label}</span>
                  {isSelected && (
                    <motion.div
                      layoutId="activeTabBadge"
                      className="absolute inset-0 border border-indigo-600/30 rounded-lg pointer-events-none"
                      transition={{ type: "spring", stiffness: 400, damping: 30 }}
                    />
                  )}
                </button>
              )
            })}
          </div>

          {/* Animated Message Exchange Window */}
          <div className="p-6 sm:p-8 space-y-4">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeItem.id}
                initial={{ opacity: 0, scale: 0.98, y: 8 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.98, y: -8 }}
                transition={{ duration: 0.25, ease: "easeOut" }}
                className="space-y-4"
              >
                {/* User Prompt */}
                <div className="flex items-center justify-end gap-2.5">
                  <div className="rounded-xl bg-zinc-900 dark:bg-zinc-100 px-4 py-2 text-xs text-white dark:text-zinc-900 font-medium shadow-2xs">
                    {activeItem.query}
                  </div>
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-zinc-200 dark:bg-zinc-700 text-[10px] font-bold text-zinc-700 dark:text-zinc-200">
                    AM
                  </div>
                </div>

                {/* AI Response */}
                <div className="flex items-start gap-3">
                  <motion.div
                    animate={{ rotate: [0, 5, -5, 0] }}
                    transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
                    className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-indigo-600 text-white shadow-xs"
                  >
                    <Bot className="h-4 w-4" />
                  </motion.div>

                  <div className="space-y-2 flex-1 max-w-xl">
                    <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/60 p-3.5 text-xs text-zinc-800 dark:text-zinc-200 leading-relaxed space-y-2.5 shadow-2xs">
                      <p>{activeItem.answer}</p>

                      {/* Animated Tag Pills */}
                      <div className="flex flex-wrap items-center gap-2 pt-0.5">
                        <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 dark:text-emerald-300">
                          <CheckCircle2 className="h-3 w-3" />
                          <span>{activeItem.metric}</span>
                        </span>

                        <span className="inline-flex items-center gap-1 rounded-md bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 px-2 py-0.5 text-[11px] text-zinc-600 dark:text-zinc-300 font-mono">
                          <BookOpen className="h-3 w-3 text-indigo-600 dark:text-indigo-400" />
                          <span>{activeItem.doc}</span>
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Action Bar Footer */}
          <div className="flex items-center justify-between border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50/60 dark:bg-zinc-900/60 px-6 py-3">
            <div className="flex items-center gap-2 text-xs text-zinc-500">
              <span className="flex h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span>Grounded in 28 Verified Policies</span>
            </div>
            <Link to="/login">
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                <Button size="sm" className="h-7 text-xs bg-indigo-600 hover:bg-indigo-700 text-white rounded-md gap-1 shadow-2xs">
                  <span>Try Demo</span>
                  <ChevronRight className="h-3 w-3" />
                </Button>
              </motion.div>
            </Link>
          </div>
        </motion.div>

        {/* 4 ICON-FIRST CAPABILITY TILES */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { icon: BookOpen, label: "Policy Citations", sub: "100% Grounded" },
            { icon: Database, label: "Live HRMS Sync", sub: "Real-time Balances" },
            { icon: Send, label: "1-Click Approvals", sub: "Auto-Workflows" },
            { icon: ShieldCheck, label: "RBAC Security", sub: "SOC-2 Certified" },
          ].map((feat) => {
            const Icon = feat.icon
            return (
              <motion.div
                key={feat.label}
                whileHover={{ y: -4, scale: 1.02 }}
                transition={{ type: "spring", stiffness: 300, damping: 20 }}
                className="flex items-center gap-3 rounded-xl border border-zinc-200/80 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-3.5 shadow-2xs hover:border-indigo-300 dark:hover:border-indigo-800 transition-colors"
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-400">
                  <Icon className="h-4.5 w-4.5" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 truncate">
                    {feat.label}
                  </p>
                  <p className="text-[10px] text-zinc-400 truncate">{feat.sub}</p>
                </div>
              </motion.div>
            )
          })}
        </div>

        {/* LIVE METRICS STRIP */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.4 }}
          className="rounded-xl border border-zinc-200/80 dark:border-zinc-800 bg-white/70 dark:bg-zinc-900/40 p-4 grid grid-cols-3 gap-2 text-center shadow-2xs"
        >
          <div>
            <p className="text-xl font-bold tabular-nums text-indigo-600 dark:text-indigo-400">78%</p>
            <p className="text-[10px] text-zinc-500 uppercase tracking-wider font-medium">Deflection</p>
          </div>
          <div className="border-x border-zinc-200 dark:border-zinc-800">
            <p className="text-xl font-bold tabular-nums text-zinc-900 dark:text-zinc-100">&lt; 2s</p>
            <p className="text-[10px] text-zinc-500 uppercase tracking-wider font-medium">Latency</p>
          </div>
          <div>
            <p className="text-xl font-bold tabular-nums text-emerald-600 dark:text-emerald-400">99.4%</p>
            <p className="text-[10px] text-zinc-500 uppercase tracking-wider font-medium">Accuracy</p>
          </div>
        </motion.div>
      </main>

      {/* Footer */}
      <footer className="border-t border-zinc-200/80 bg-white/80 py-4 dark:border-zinc-800/80 dark:bg-zinc-950 text-xs text-zinc-400">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6">
          <span className="text-[11px]">Assistify HRMS · Nexora Technologies Enterprise</span>
          <Link to="/login" className="text-indigo-600 dark:text-indigo-400 hover:underline text-[11px] font-medium">
            Go to Login →
          </Link>
        </div>
      </footer>
    </div>
  )
}
