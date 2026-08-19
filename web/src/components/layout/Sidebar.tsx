import React from "react"
import { Link, useLocation, useNavigate } from "react-router-dom"
import {
  PanelLeftClose,
  PanelLeftOpen,
  Sparkles,
  ChevronRight,
  LogOut,
} from "lucide-react"
import { useAuth } from "@/context/AuthContext"
import { api } from "@/lib/api"
import { LEAVE_TYPE_LABELS, type LeaveBalance } from "@/lib/types"
import { getNavigationGroupsForRole, type NavItem } from "@/config/navigation"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

/**
 * The employee's real remaining balance.
 *
 * This card used to read "27d total · Casual: 8 · Sick: 5 · Earned: 14" for
 * every person at every company. It now shows what /leave/my-balance says, and
 * renders nothing at all while that is in flight or if it fails — an empty
 * corner of a sidebar is honest in a way a plausible wrong number is not.
 */
const LeaveQuotaCard: React.FC = () => {
  const [balances, setBalances] = React.useState<LeaveBalance[] | null>(null)

  React.useEffect(() => {
    let cancelled = false
    api
      .get<{ balances: LeaveBalance[] }>("/leave/my-balance")
      .then((r) => !cancelled && setBalances(r.balances))
      .catch(() => !cancelled && setBalances([]))
    return () => {
      cancelled = true
    }
  }, [])

  if (!balances || balances.length === 0) return null
  const total = balances.reduce((sum, b) => sum + b.available, 0)

  return (
    <div className="rounded-xl border border-indigo-100 bg-gradient-to-b from-indigo-50/70 to-indigo-50/30 dark:border-indigo-900/50 dark:from-indigo-950/40 dark:to-indigo-950/20 p-3.5 space-y-2 text-xs shadow-2xs">
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold uppercase tracking-wider text-indigo-700 dark:text-indigo-300 flex items-center gap-1.5">
          <Sparkles className="h-3.5 w-3.5" />
          Leave Left
        </span>
        <span className="text-xs font-mono text-indigo-600 dark:text-indigo-400 font-semibold">
          {total}d total
        </span>
      </div>
      <p className="text-xs text-zinc-600 dark:text-zinc-400">
        {balances.map((b, i) => (
          <React.Fragment key={b.type}>
            {i > 0 && " · "}
            {LEAVE_TYPE_LABELS[b.type].replace(" Leave", "")}:{" "}
            <strong className="text-zinc-900 dark:text-zinc-100">{b.available}</strong>
          </React.Fragment>
        ))}
      </p>
      <Link
        to="/app/chat"
        className="inline-flex items-center justify-between w-full pt-1 text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline"
      >
        <span>Ask the Assistant</span>
        <ChevronRight className="h-3.5 w-3.5" />
      </Link>
    </div>
  )
}

/**
 * How many leave requests are actually waiting on HR right now.
 *
 * The "Avg resolution: 1.4h" line that sat under this is gone — nothing in the
 * system measures decision time, so there was no number to replace it with.
 */
const ApprovalQueueCard: React.FC = () => {
  const [pending, setPending] = React.useState<number | null>(null)

  React.useEffect(() => {
    let cancelled = false
    api
      .get<{ requests: unknown[] }>("/leave/requests?status=PENDING")
      .then((r) => !cancelled && setPending(r.requests.length))
      .catch(() => !cancelled && setPending(null))
    return () => {
      cancelled = true
    }
  }, [])

  if (pending === null) return null

  return (
    <div className="rounded-xl border border-amber-200/80 bg-amber-50/50 dark:border-amber-900/50 dark:bg-amber-950/30 p-3.5 space-y-2 text-xs shadow-2xs">
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold uppercase tracking-wider text-amber-800 dark:text-amber-300 flex items-center gap-1.5">
          <span
            className={cn(
              "h-2 w-2 rounded-full bg-amber-500",
              pending > 0 && "animate-pulse",
            )}
          />
          Approval Queue
        </span>
        <Badge
          variant={pending > 0 ? "pending" : "active"}
          className="text-xs py-0.5 px-1.5 font-mono font-semibold"
        >
          {pending} Pending
        </Badge>
      </div>
      <p className="text-xs text-zinc-600 dark:text-zinc-400">
        {pending === 0
          ? "Nothing is waiting on a decision."
          : `${pending} request${pending === 1 ? "" : "s"} awaiting your decision.`}
      </p>
      <Link
        to="/app/leave-approvals"
        className="inline-flex items-center justify-between w-full pt-1 text-xs font-semibold text-amber-700 dark:text-amber-400 hover:underline"
      >
        <span>Review approvals</span>
        <ChevronRight className="h-3.5 w-3.5" />
      </Link>
    </div>
  )
}

interface SidebarProps {
  isCollapsed: boolean
  setIsCollapsed: React.Dispatch<React.SetStateAction<boolean>>
  onNavigate?: () => void
}

export const Sidebar: React.FC<SidebarProps> = ({
  isCollapsed,
  setIsCollapsed,
  onNavigate,
}) => {
  const { user, logout } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const currentRole = user?.role || "employee"
  const navGroups = getNavigationGroupsForRole(currentRole)

  const isItemActive = (href: string) => {
    if (href === "/app") {
      return location.pathname === "/app"
    }
    return location.pathname.startsWith(href)
  }

  const getInitials = (name?: string) => {
    if (!name) return "U"
    return name
      .split(" ")
      .map((part) => part[0])
      .join("")
      .toUpperCase()
      .slice(0, 2)
  }

  return (
    <TooltipProvider delayDuration={200}>
      <aside
        className={cn(
          "relative flex h-screen flex-col border-r border-zinc-200/90 bg-white transition-all duration-200 ease-in-out dark:border-zinc-800/90 dark:bg-zinc-950 select-none shadow-2xs",
          isCollapsed ? "w-16" : "w-64"
        )}
      >
        {/* TOP WORDMARK & WORKSPACE HEADER */}
        <div className="flex h-16 items-center justify-between border-b border-zinc-200/90 px-4 dark:border-zinc-800/90">
          <Link
            to="/app"
            className="flex items-center gap-3 overflow-hidden font-semibold tracking-tight text-zinc-900 dark:text-zinc-100 focus:outline-none"
          >
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-indigo-600 text-white shadow-xs">
              <Sparkles className="h-4.5 w-4.5" />
            </div>
            {!isCollapsed && (
              <div className="flex flex-col truncate">
                <div className="flex items-center gap-1.5">
                  <span className="text-base font-bold tracking-tight text-zinc-900 dark:text-white leading-tight">
                    Assistify
                  </span>
                  <span className="h-2 w-2 rounded-full bg-emerald-500" />
                </div>
                <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400 truncate">
                  {user?.company}
                </span>
              </div>
            )}
          </Link>
        </div>

        {/* NAVIGATION ITEMS WITH ROLE-AWARE CATEGORIES */}
        <div className="flex-1 overflow-y-auto px-3 py-4 space-y-5 custom-scrollbar">
          {navGroups.map((group, groupIdx) => (
            <div key={groupIdx} className="space-y-1.5">
              {!isCollapsed && (
                <div className="px-2.5 pb-1 pt-0.5 text-xs font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
                  {group.groupTitle}
                </div>
              )}
              {group.items.map((item: NavItem) => {
                const active = isItemActive(item.href)
                const Icon = item.icon

                const linkContent = (
                  <Link
                    key={item.href}
                    to={item.href}
                    onClick={onNavigate}
                    className={cn(
                      "group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-150 relative",
                      active
                        ? "bg-indigo-50 text-indigo-700 font-semibold dark:bg-indigo-950/50 dark:text-indigo-300 shadow-2xs"
                        : "text-zinc-600 hover:bg-zinc-100/80 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-900 dark:hover:text-zinc-100",
                      isCollapsed && "justify-center px-0"
                    )}
                  >
                    <Icon
                      className={cn(
                        "h-4.5 w-4.5 shrink-0 transition-colors",
                        active
                          ? "text-indigo-600 dark:text-indigo-400"
                          : "text-zinc-400 group-hover:text-zinc-700 dark:text-zinc-500 dark:group-hover:text-zinc-200"
                      )}
                    />
                    {!isCollapsed && (
                      <>
                        <span className="truncate flex-1">{item.label}</span>
                        {item.badge !== undefined && (
                          <Badge
                            variant={item.badgeVariant || "default"}
                            className="h-4.5 min-w-4.5 px-2 text-xs font-mono tabular-nums leading-none"
                          >
                            {item.badge}
                          </Badge>
                        )}
                      </>
                    )}
                  </Link>
                )

                if (isCollapsed) {
                  return (
                    <Tooltip key={item.href}>
                      <TooltipTrigger asChild>{linkContent}</TooltipTrigger>
                      <TooltipContent side="right" className="flex items-center gap-2">
                        <span className="text-xs">{item.label}</span>
                        {item.badge !== undefined && (
                          <span className="text-xs opacity-70">({item.badge})</span>
                        )}
                      </TooltipContent>
                    </Tooltip>
                  )
                }

                return linkContent
              })}
            </div>
          ))}

          {/* ROLE-TAILORED STATUS WIDGET — fetched, never hardcoded. */}
          {!isCollapsed && (
            <div className="pt-2">
              {currentRole === "employee" && <LeaveQuotaCard />}
              {currentRole === "hr" && <ApprovalQueueCard />}
            </div>
          )}
        </div>

        {/* BOTTOM USER PROFILE & COLLAPSE RAIL */}
        <div className="border-t border-zinc-200/90 p-3 dark:border-zinc-800/90 space-y-2">
          {!isCollapsed ? (
            <div className="flex items-center justify-between p-2 rounded-xl hover:bg-zinc-100/80 dark:hover:bg-zinc-900 transition-colors">
              <div className="flex items-center gap-3 min-w-0">
                <Avatar className="h-8 w-8 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-100 dark:bg-zinc-800">
                  <AvatarFallback className="text-xs font-bold text-zinc-700 dark:text-zinc-300">
                    {getInitials(user?.name)}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <p className="text-sm font-bold text-zinc-900 dark:text-zinc-100 truncate">
                    {user?.name}
                  </p>
                  <p className="text-xs text-zinc-400 truncate">
                    {user?.email}
                  </p>
                </div>
              </div>

              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  logout()
                  navigate("/login")
                }}
                className="h-8 w-8 p-0 text-zinc-400 hover:text-rose-600 dark:hover:text-rose-400 rounded-lg"
                title="Log out"
              >
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <div className="flex justify-center py-1">
              <Avatar className="h-8 w-8 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-100 dark:bg-zinc-800">
                <AvatarFallback className="text-xs font-bold text-zinc-700 dark:text-zinc-300">
                  {getInitials(user?.name)}
                </AvatarFallback>
              </Avatar>
            </div>
          )}

          {/* Collapse Trigger */}
          <div className="hidden md:flex items-center justify-between pt-1 border-t border-zinc-100 dark:border-zinc-800/80">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsCollapsed((prev) => !prev)}
              className={cn(
                "w-full justify-start text-xs text-zinc-400 hover:text-zinc-700 dark:text-zinc-500 dark:hover:text-zinc-300 h-8 font-medium",
                isCollapsed && "justify-center px-0"
              )}
              title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            >
              {isCollapsed ? (
                <PanelLeftOpen className="h-4 w-4" />
              ) : (
                <>
                  <PanelLeftClose className="h-4 w-4 mr-2 shrink-0" />
                  <span className="truncate">Collapse</span>
                </>
              )}
            </Button>
          </div>
        </div>
      </aside>
    </TooltipProvider>
  )
}
