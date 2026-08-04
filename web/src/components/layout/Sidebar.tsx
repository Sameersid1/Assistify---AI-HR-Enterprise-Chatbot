import React from "react"
import { Link, useLocation } from "react-router-dom"
import { PanelLeftClose, PanelLeftOpen, Sparkles } from "lucide-react"
import { useAuth } from "@/context/AuthContext"
import { getNavigationForRole, type NavItem } from "@/config/navigation"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

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
  const { user } = useAuth()
  const location = useLocation()
  const currentRole = user?.role || "hr"
  const navItems = getNavigationForRole(currentRole)

  const isItemActive = (href: string) => {
    if (href === "/app") {
      return location.pathname === "/app"
    }
    return location.pathname.startsWith(href)
  }

  return (
    <TooltipProvider delayDuration={200}>
      <aside
        className={cn(
          "relative flex h-screen flex-col border-r border-zinc-200 bg-white transition-all duration-200 ease-in-out dark:border-zinc-800 dark:bg-zinc-900 select-none",
          isCollapsed ? "w-16" : "w-64"
        )}
      >
        {/* Top Wordmark & Logo */}
        <div className="flex h-14 items-center justify-between border-b border-zinc-200 px-4 dark:border-zinc-800">
          <Link
            to="/app"
            className="flex items-center gap-2.5 overflow-hidden font-semibold tracking-tight text-zinc-900 dark:text-zinc-100 focus:outline-none"
          >
            {/* Small Indigo Square Logo Mark */}
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-indigo-600 text-white shadow-none">
              <Sparkles className="h-4 w-4" />
            </div>
            {!isCollapsed && (
              <div className="flex flex-col truncate">
                <span className="text-sm font-semibold tracking-tight text-zinc-900 dark:text-white leading-tight">
                  Assistify
                </span>
                <span className="text-[10px] font-normal text-zinc-500 dark:text-zinc-400 truncate">
                  {user?.company || "Nexora Technologies"}
                </span>
              </div>
            )}
          </Link>
        </div>

        {/* Navigation Items */}
        <div className="flex-1 overflow-y-auto px-2 py-3">
          <div className="space-y-1">
            {!isCollapsed && (
              <div className="px-2 pb-1.5 pt-1 text-[11px] font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
                Menu
              </div>
            )}
            {navItems.map((item: NavItem) => {
              const active = isItemActive(item.href)
              const Icon = item.icon

              const linkContent = (
                <Link
                  key={item.href}
                  to={item.href}
                  onClick={onNavigate}
                  className={cn(
                    "group flex items-center gap-3 rounded-md px-2.5 py-2 text-xs font-medium transition-colors relative",
                    active
                      ? "bg-indigo-50 text-indigo-700 border-l-2 border-indigo-600 font-semibold dark:bg-indigo-950/40 dark:text-indigo-300 dark:border-indigo-500"
                      : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800/60 dark:hover:text-zinc-100 border-l-2 border-transparent",
                    isCollapsed && "justify-center px-0"
                  )}
                >
                  <Icon
                    className={cn(
                      "h-4 w-4 shrink-0 transition-colors",
                      active
                        ? "text-indigo-600 dark:text-indigo-400"
                        : "text-zinc-500 group-hover:text-zinc-900 dark:text-zinc-400 dark:group-hover:text-zinc-100"
                    )}
                  />
                  {!isCollapsed && (
                    <>
                      <span className="truncate flex-1">{item.label}</span>
                      {item.badge !== undefined && (
                        <Badge
                          variant={item.badgeVariant || "default"}
                          className="h-4 min-w-4 px-1.5 text-[10px] font-mono tabular-nums leading-none"
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
                      <span>{item.label}</span>
                      {item.badge !== undefined && (
                        <span className="text-[10px] opacity-70">({item.badge})</span>
                      )}
                    </TooltipContent>
                  </Tooltip>
                )
              }

              return linkContent
            })}
          </div>
        </div>

        {/* Bottom Collapse Toggle Rail */}
        <div className="hidden md:flex h-12 items-center justify-between border-t border-zinc-200 p-2 dark:border-zinc-800">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsCollapsed((prev) => !prev)}
            className={cn(
              "w-full justify-start text-xs text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100",
              isCollapsed && "justify-center px-0"
            )}
            title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {isCollapsed ? (
              <PanelLeftOpen className="h-4 w-4" />
            ) : (
              <>
                <PanelLeftClose className="h-4 w-4 mr-2 shrink-0" />
                <span className="truncate">Collapse Sidebar</span>
              </>
            )}
          </Button>
        </div>
      </aside>
    </TooltipProvider>
  )
}
