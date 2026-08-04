import React from "react"
import { BarChart3, TrendingUp, HelpCircle, Users, CheckCircle2 } from "lucide-react"
import { Badge } from "@/components/ui/badge"

export const AnalyticsPage: React.FC = () => {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
          HR Analytics & Insights
        </h1>
        <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
          Aggregated employee query volume, deflection rates, and policy adoption metrics
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
          <span className="text-xs text-zinc-500">AI Query Deflection</span>
          <div className="mt-2 text-2xl font-semibold tabular-nums text-emerald-600 dark:text-emerald-400">
            78.4%
          </div>
          <p className="text-[11px] text-zinc-500 mt-1">+4.2% from last month</p>
        </div>

        <div className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
          <span className="text-xs text-zinc-500">Total Queries Handled</span>
          <div className="mt-2 text-2xl font-semibold tabular-nums text-zinc-900 dark:text-zinc-100">
            1,429
          </div>
          <p className="text-[11px] text-zinc-500 mt-1">Past 30 days</p>
        </div>

        <div className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
          <span className="text-xs text-zinc-500">Avg Resolution Speed</span>
          <div className="mt-2 text-2xl font-semibold tabular-nums text-indigo-600 dark:text-indigo-400">
            1.8s
          </div>
          <p className="text-[11px] text-zinc-500 mt-1">Real-time vector inference</p>
        </div>
      </div>

      <div className="rounded-lg border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900 p-5 space-y-3">
        <h3 className="text-sm font-medium text-zinc-500 uppercase tracking-wide">
          Top Inquired Topics
        </h3>
        <div className="space-y-2 text-xs">
          <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800/60 pb-2">
            <span>1. Casual & Privilege Leave Carryover Rules</span>
            <span className="font-mono tabular-nums text-zinc-500">412 queries (28.8%)</span>
          </div>
          <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800/60 pb-2">
            <span>2. Health Insurance Dependent Coverage</span>
            <span className="font-mono tabular-nums text-zinc-500">289 queries (20.2%)</span>
          </div>
          <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800/60 pb-2">
            <span>3. Hybrid WFH Policy Stipends</span>
            <span className="font-mono tabular-nums text-zinc-500">214 queries (15.0%)</span>
          </div>
          <div className="flex items-center justify-between">
            <span>4. Tax Exemption Proofs Submission</span>
            <span className="font-mono tabular-nums text-zinc-500">185 queries (12.9%)</span>
          </div>
        </div>
      </div>
    </div>
  )
}
