import React from "react"
import { useLocation, useNavigate } from "react-router-dom"
import {
  Bell,
  Search,
  Menu,
  Moon,
  Sun,
  LogOut,
  UserCheck,
  ShieldAlert,
  Headphones,
  User as UserIcon,
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
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

interface TopBarProps {
  onOpenMobileNav: () => void
}

const ROUTE_TITLES: Record<string, string> = {
  "/app": "Dashboard",
  "/app/chat": "HR Assistant Chat",
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
    (location.pathname.startsWith("/app/chat") ? "HR Assistant Chat" : "Dashboard")

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
        return "HR Admin"
      case "admin":
        return "System Admin"
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
    <header className="sticky top-0 z-30 flex h-14 w-full items-center justify-between border-b border-zinc-200 bg-white/95 px-6 backdrop-blur-sm dark:border-zinc-800 dark:bg-zinc-900/95">
      {/* Left: Mobile hamburger + Page Title */}
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon-sm"
          className="md:hidden text-zinc-600 dark:text-zinc-300"
          onClick={onOpenMobileNav}
          aria-label="Open Navigation"
        >
          <Menu className="h-4 w-4" />
        </Button>
        <h1 className="text-sm font-semibold tracking-tight text-zinc-900 dark:text-zinc-100 md:text-base">
          {currentTitle}
        </h1>
      </div>

      {/* Right: Search, Notifications, User Profile */}
      <div className="flex items-center gap-3">
        {/* Global Search Input */}
        <div className="relative hidden sm:block w-64">
          <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-400 dark:text-zinc-500" />
          <Input
            type="search"
            placeholder="Search questions, policies, tickets..."
            className="h-8 pl-8 pr-12 text-xs bg-zinc-50 dark:bg-zinc-800/60 border-zinc-200 dark:border-zinc-700/60 placeholder:text-zinc-400"
          />
          <kbd className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 rounded border border-zinc-200 bg-white px-1.5 py-0.5 font-mono text-[10px] font-medium text-zinc-400 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-400 select-none">
            ⌘K
          </kbd>
        </div>

        {/* Notification Bell with Indigo Dot Badge */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              size="icon-sm"
              className="relative h-8 w-8 text-zinc-600 hover:text-zinc-900 dark:text-zinc-300 dark:hover:text-white"
              aria-label="Notifications"
            >
              <Bell className="h-4 w-4" />
              {/* Indigo dot badge */}
              <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-indigo-600 ring-2 ring-white dark:ring-zinc-900" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-80 p-2">
            <div className="flex items-center justify-between px-2 py-1.5">
              <span className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">
                Notifications
              </span>
              <Badge variant="default" className="text-[10px]">
                3 New
              </Badge>
            </div>
            <DropdownMenuSeparator />
            <div className="space-y-1 py-1">
              <div className="rounded-md p-2 text-xs hover:bg-zinc-50 dark:hover:bg-zinc-800 cursor-pointer">
                <p className="font-medium text-zinc-900 dark:text-zinc-100">
                  Leave application submitted
                </p>
                <p className="text-[11px] text-zinc-500">
                  Devin Vance requested 2 days Casual Leave.
                </p>
                <span className="text-[10px] text-zinc-400">10m ago</span>
              </div>
              <div className="rounded-md p-2 text-xs hover:bg-zinc-50 dark:hover:bg-zinc-800 cursor-pointer">
                <p className="font-medium text-zinc-900 dark:text-zinc-100">
                  Policy update uploaded
                </p>
                <p className="text-[11px] text-zinc-500">
                  Health Insurance Scheme 2026 indexed.
                </p>
                <span className="text-[10px] text-zinc-400">1h ago</span>
              </div>
            </div>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* User Profile Avatar Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              className="flex items-center gap-2 p-1 pl-1.5 h-8 hover:bg-zinc-100 dark:hover:bg-zinc-800"
            >
              <Avatar className="h-6 w-6 rounded-md">
                <AvatarFallback className="bg-indigo-600 text-[11px] font-semibold text-white">
                  {getInitials(user?.name)}
                </AvatarFallback>
              </Avatar>
              <span className="hidden text-xs font-medium text-zinc-700 dark:text-zinc-300 md:inline-block truncate max-w-[100px]">
                {user?.name || "Arjun Mehta"}
              </span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-60">
            <div className="flex flex-col space-y-1 p-2">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold leading-none text-zinc-900 dark:text-zinc-100">
                  {user?.name || "Arjun Mehta"}
                </p>
                <Badge variant={getRoleBadgeVariant(user?.role)} className="text-[10px] uppercase">
                  {formatRoleName(user?.role)}
                </Badge>
              </div>
              <p className="text-[11px] text-zinc-500 leading-none truncate">
                {user?.email || "arjun@nexora.com"}
              </p>
            </div>
            <DropdownMenuSeparator />

            {/* NOTE: the "Switch Demo Role" menu was removed during backend
                integration. Role now comes from the JWT the server issues â€” a
                client that can change its own role defeats the whole
                access-control model. To demo a different role, log out and
                sign in as that user. */}
            <DropdownMenuGroup>
              {/* Dark Mode Toggle */}
              <DropdownMenuItem onClick={toggleTheme} className="text-xs">
                {theme === "dark" ? (
                  <>
                    <Sun className="mr-2 h-3.5 w-3.5 text-amber-500" />
                    <span>Light Mode</span>
                  </>
                ) : (
                  <>
                    <Moon className="mr-2 h-3.5 w-3.5 text-zinc-600" />
                    <span>Dark Mode</span>
                  </>
                )}
              </DropdownMenuItem>
            </DropdownMenuGroup>

            <DropdownMenuSeparator />

            {/* Logout */}
            <DropdownMenuItem
              onClick={handleLogout}
              className="text-xs text-rose-600 dark:text-rose-400 focus:bg-rose-50 dark:focus:bg-rose-950/40"
            >
              <LogOut className="mr-2 h-3.5 w-3.5" />
              <span>Log out</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
