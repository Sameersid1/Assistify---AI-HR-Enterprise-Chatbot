import {
  LayoutDashboard,
  MessageSquare,
  Ticket,
  Users2,
  CalendarCheck,
  FileText,
  LifeBuoy,
  BarChart3,
  Terminal,
  UserCog,
  Settings,
  type LucideIcon,
} from "lucide-react"
import { type UserRole } from "@/context/AuthContext"

export interface NavItem {
  label: string
  icon: LucideIcon
  href: string
  roles: UserRole[]
  badge?: string | number
  badgeVariant?: "default" | "active" | "pending" | "error" | "inactive"
}

export const NAVIGATION_ITEMS: NavItem[] = [
  {
    label: "Dashboard",
    icon: LayoutDashboard,
    href: "/app",
    roles: ["employee", "hr", "it_support", "admin"],
  },
  {
    label: "Chat",
    icon: MessageSquare,
    href: "/app/chat",
    roles: ["employee", "hr"],
  },
  {
    label: "My Tickets",
    icon: Ticket,
    href: "/app/my-tickets",
    roles: ["employee"],
    badge: 2,
    badgeVariant: "pending",
  },
  {
    label: "Employees",
    icon: Users2,
    href: "/app/employees",
    roles: ["hr"],
  },
  {
    label: "Leave Approvals",
    icon: CalendarCheck,
    href: "/app/leave-approvals",
    roles: ["hr"],
    badge: 4,
    badgeVariant: "pending",
  },
  {
    label: "Documents",
    icon: FileText,
    href: "/app/documents",
    roles: ["hr"],
  },
  {
    label: "Tickets",
    icon: LifeBuoy,
    href: "/app/tickets",
    roles: ["hr"],
    badge: 5,
    badgeVariant: "default",
  },
  {
    label: "Analytics",
    icon: BarChart3,
    href: "/app/analytics",
    roles: ["hr"],
  },
  {
    label: "IT Tickets",
    icon: Terminal,
    href: "/app/it-tickets",
    roles: ["it_support"],
    badge: 3,
    badgeVariant: "default",
  },
  {
    label: "Users",
    icon: UserCog,
    href: "/app/users",
    roles: ["admin"],
  },
  {
    label: "Settings",
    icon: Settings,
    href: "/app/settings",
    roles: ["admin"],
  },
]

export function getNavigationForRole(role: UserRole): NavItem[] {
  return NAVIGATION_ITEMS.filter((item) => item.roles.includes(role))
}
