import {
  LayoutDashboard,
  MessageSquare,
  Ticket,
  Users2,
  CalendarCheck,
  CalendarDays,
  FileText,
  LifeBuoy,
  BarChart3,
  Terminal,
  UserCog,
  Settings,
  ShieldAlert,
  Sparkles,
  CalendarPlus,
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
  isNew?: boolean
}

export interface NavGroup {
  groupTitle: string
  items: NavItem[]
}

/**
 * super_admin is omitted on purpose — a platform-level role that is still a
 * SHOULD-HAVE and not built. It falls back to the admin menu in the lookup
 * below, so this is Partial rather than an invented empty entry.
 * (Re-applied after each frontend regeneration.)
 */
export const NAVIGATION_GROUPS: Partial<Record<UserRole, NavGroup[]>> = {
  employee: [
    {
      groupTitle: "Workspace",
      items: [
        {
          label: "Dashboard",
          icon: LayoutDashboard,
          href: "/app",
          roles: ["employee"],
        },
        {
          label: "Apply for Leave",
          icon: CalendarPlus,
          href: "/app/apply-leave",
          roles: ["employee"],
          badge: "New",
          badgeVariant: "active",
        },
        {
          label: "HR Assistant Chat",
          icon: MessageSquare,
          href: "/app/chat",
          roles: ["employee"],
          badge: "AI",
          badgeVariant: "active",
        },
      ],
    },
    {
      groupTitle: "Self-Service",
      items: [
        {
          label: "My Tickets",
          icon: Ticket,
          href: "/app/my-tickets",
          roles: ["employee"],
          badge: 2,
          badgeVariant: "pending",
        },
        {
          label: "Company Policies",
          icon: FileText,
          href: "/app/documents",
          roles: ["employee"],
        },
      ],
    },
  ],

  hr: [
    {
      groupTitle: "Work Queue",
      items: [
        {
          label: "Dashboard",
          icon: LayoutDashboard,
          href: "/app",
          roles: ["hr"],
        },
        {
          label: "Leave Approvals",
          icon: CalendarCheck,
          href: "/app/leave-approvals",
          roles: ["hr"],
          badge: 7,
          badgeVariant: "pending",
        },
        {
          label: "Employee Directory",
          icon: Users2,
          href: "/app/employees",
          roles: ["hr"],
        },
        {
          label: "Support Tickets",
          icon: Ticket,
          href: "/app/tickets",
          roles: ["hr"],
          badge: 12,
        },
      ],
    },
    {
      groupTitle: "Operations",
      items: [
        {
          label: "HR Analytics",
          icon: BarChart3,
          href: "/app/analytics",
          roles: ["hr"],
        },
        {
          label: "Company Policies",
          icon: FileText,
          href: "/app/documents",
          roles: ["hr"],
        },
      ],
    },
  ],

  admin: [
    {
      groupTitle: "Governance",
      items: [
        {
          label: "Dashboard",
          icon: LayoutDashboard,
          href: "/app",
          roles: ["admin"],
        },
        {
          label: "User Management",
          icon: UserCog,
          href: "/app/users",
          roles: ["admin"],
          badge: "RBAC",
          badgeVariant: "active",
        },
        {
          label: "System Settings",
          icon: Settings,
          href: "/app/settings",
          roles: ["admin"],
        },
      ],
    },
  ],

  it_support: [
    {
      groupTitle: "IT Queue",
      items: [
        {
          label: "Dashboard",
          icon: LayoutDashboard,
          href: "/app",
          roles: ["it_support"],
        },
        {
          label: "IT Tickets",
          icon: LifeBuoy,
          href: "/app/it-tickets",
          roles: ["it_support"],
          badge: 5,
          badgeVariant: "pending",
        },
      ],
    },
  ],
}

export const getNavigationGroupsForRole = (role: UserRole): NavGroup[] => {
  if (role === "super_admin") return NAVIGATION_GROUPS.admin ?? []
  return NAVIGATION_GROUPS[role] ?? NAVIGATION_GROUPS.employee ?? []
}
