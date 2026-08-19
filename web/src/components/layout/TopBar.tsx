import React from "react"
import { useLocation, useNavigate } from "react-router-dom"
import {
  Bell,
  Search,
  Menu,
  Moon,
  Sun,
  LogOut,
} from "lucide-react"
import { useAuth, type UserRole } from "@/context/AuthContext"
import { useTheme } from "@/context/ThemeContext"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

interface TopBarProps {
  onOpenMobileNav: () => void
}

const ROUTE_TITLES: Record<string, string> = {
  "/app": "Dashboard",
  "/app/chat": "Assistify Assistant",
  "/app/apply-leave": "Apply for Time Off",
  "/app/my-tickets": "My Tickets",
  "/app/employees": "Employee Directory",
  "/app/leave-approvals": "Leave Approvals",
  "/app/documents": "Company Policies & Documents",
  "/app/tickets": "Support Tickets",
  "/app/analytics": "HR Analytics",
  "/app/it-tickets": "IT Support Tickets",
  "/app/users": "User Management",
  "/app/settings": "Organization Settings",
}

export const TopBar: React.FC<TopBarProps> = ({ onOpenMobileNav }) => {
  const location = useLocation()
  const navigate = useNavigate()
  const { user, logout } = useAuth()
  const { theme, toggleTheme } = useTheme()

  const currentTitle =
    ROUTE_TITLES[location.pathname] ||
    (location.pathname.startsWith("/app/chat") ? "Assistify Assistant" : "Dashboard")

  const getRoleBadgeVariant = (role?: UserRole) => {
    switch (role) {
      case "hr":
        return "default"
      case "admin":
        return "active"
      case "it_support":
        return "pending"
      default:
        return "secondary"
    }
  }

  const formatRoleName = (role?: UserRole) => {
    switch (role) {
      case "hr":
        return "HR Manager"
      case "admin":
        return "Administrator"
      case "it_support":
        return "IT Support"
      default:
        return "Employee"
    }
  }

  const getInitials = (name?: string) => {
    if (!name) return "AM"
    const parts = name.split(" ")
    return parts.map((n) => n[0]).join("").toUpperCase()
  }

  const handleLogout = () => {
    logout()
    navigate("/login")
  }

  return (
    <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b border-zinc-200/90 bg-white/95 px-6 md:px-8 lg:px-10 backdrop-blur-sm dark:border-zinc-800/90 dark:bg-zinc-950/95 shadow-2xs">
      {/* Left: Mobile hamburger + Dark/Light Mode toggle + Page Title */}
      <div className="flex items-center gap-3.5">
        <Button
          variant="ghost"
          size="icon-sm"
          className="md:hidden text-zinc-600 dark:text-zinc-300"
          onClick={onOpenMobileNav}
          aria-label="Open Navigation"
        >
          <Menu className="h-5 w-5" />
        </Button>

        {/* Top-Left Dark/Light Mode Switcher */}
        <Button
          variant="outline"
          size="icon-sm"
          onClick={toggleTheme}
          className="h-8.5 w-8.5 rounded-lg border-zinc-200 text-zinc-700 hover:text-zinc-900 dark:border-zinc-800 dark:text-zinc-200 dark:hover:text-white shadow-2xs"
          title={theme === "dark" ? "Switch to Light Mode" : "Switch to Dark Mode"}
          aria-label="Toggle Theme"
        >
          {theme === "dark" ? (
            <Sun className="h-4.5 w-4.5 text-amber-400" />
          ) : (
            <Moon className="h-4.5 w-4.5 text-zinc-700" />
          )}
        </Button>

        <h1 className="text-base font-bold tracking-tight text-zinc-900 dark:text-zinc-100 md:text-lg">
          {currentTitle}
        </h1>
      </div>

      {/* Right: Search, Notifications, User Profile */}
      <div className="flex items-center gap-3">
        {/* Global Search Input */}
        <div className="relative hidden sm:block w-64">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400 dark:text-zinc-500" />
          <Input
            type="search"
            placeholder="Search..."
            className="h-9 pl-9 pr-12 text-sm bg-zinc-50 dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 placeholder:text-zinc-400"
          />
          <kbd className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 rounded border border-zinc-200 bg-white px-1.5 py-0.5 font-mono text-[10px] font-semibold text-zinc-400 dark:border-zinc-800 dark:bg-zinc-900 select-none">
            ⌘K
          </kbd>
        </div>

        {/* Notification Bell */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              size="icon-sm"
              className="relative h-8.5 w-8.5 rounded-lg border-zinc-200 text-zinc-700 hover:text-zinc-900 dark:border-zinc-800 dark:text-zinc-300 dark:hover:text-white"
              aria-label="Notifications"
            >
              <Bell className="h-4.5 w-4.5" />
              <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-indigo-600 ring-2 ring-white dark:ring-zinc-950" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-80 p-2">
            <div className="flex items-center justify-between px-2.5 py-1.5">
              <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                Notifications
              </span>
              <Badge variant="default" className="text-xs py-0.5 px-2 font-mono">
                2 New
              </Badge>
            </div>
            <DropdownMenuSeparator />
            <div className="space-y-1 py-1">
              <div className="rounded-lg p-2.5 text-xs hover:bg-zinc-50 dark:hover:bg-zinc-800/60 cursor-pointer space-y-0.5">
                <p className="font-semibold text-zinc-900 dark:text-zinc-100 text-sm">
                  Leave request submitted
                </p>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  Rohan Patel requested 3 days Casual Leave.
                </p>
                <span className="text-[11px] text-zinc-400">2h ago</span>
              </div>
            </div>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* User Profile Avatar Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              className="flex items-center gap-2.5 p-1 pl-2 h-9 hover:bg-zinc-100 dark:hover:bg-zinc-900 rounded-lg"
            >
              <Avatar className="h-7 w-7 rounded-md">
                <AvatarFallback className="bg-indigo-600 text-xs font-bold text-white">
                  {getInitials(user?.name)}
                </AvatarFallback>
              </Avatar>
              <span className="hidden text-sm font-semibold text-zinc-800 dark:text-zinc-200 md:inline-block truncate max-w-[120px]">
                {user?.name}
              </span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-60">
            <div className="flex flex-col space-y-1.5 p-2.5">
              <div className="flex items-center justify-between">
                <p className="text-sm font-bold leading-none text-zinc-900 dark:text-zinc-100">
                  {user?.name}
                </p>
                <Badge variant={getRoleBadgeVariant(user?.role)} className="text-xs uppercase font-semibold">
                  {formatRoleName(user?.role)}
                </Badge>
              </div>
              <p className="text-xs text-zinc-500 leading-none truncate">
                {user?.email}
              </p>
            </div>
            <DropdownMenuSeparator />

            {/* Logout */}
            <DropdownMenuItem
              onClick={handleLogout}
              className="text-xs font-semibold text-rose-600 dark:text-rose-400 focus:bg-rose-50 dark:focus:bg-rose-950/40 p-2"
            >
              <LogOut className="mr-2 h-4 w-4" />
              <span>Log out</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
