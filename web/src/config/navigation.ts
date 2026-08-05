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
  ShieldAlert,
  Sparkles,
  Bot,
  Layers,
  History,
  CalendarDays,
  ShieldCheck,
  Cpu,
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
 * super_admin is omitted here on purpose — it is a platform-level role
 * (company provisioning) that is still a SHOULD-HAVE, not built yet. Until it
 * has its own nav it falls back to the admin menu via the lookup below, so we
 * type this as Partial rather than inventing an empty entry.
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
          label: "Support Tickets",
          icon: LifeBuoy,
          href: "/app/tickets",
          roles: ["hr"],
          badge: 12,
          badgeVariant: "default",
        },
      ],
    },
    {
      groupTitle: "People & Ops",
      items: [
        {
          label: "Employees Directory",
          icon: Users2,
          href: "/app/employees",
          roles: ["hr"],
          badge: 48,
          badgeVariant: "inactive",
        },
        {
          label: "Policy Documents",
          icon: FileText,
          href: "/app/documents",
          roles: ["hr"],
        },
        {
          label: "Analytics & Trends",
          icon: BarChart3,
          href: "/app/analytics",
          roles: ["hr"],
          badge: "New",
          badgeVariant: "active",
        },
      ],
    },
    {
      groupTitle: "Copilot",
      items: [
        {
          label: "Assistant Chat",
          icon: MessageSquare,
          href: "/app/chat",
          roles: ["hr"],
        },
      ],
    },
  ],

  admin: [
    {
      groupTitle: "System Governance",
      items: [
        {
          label: "System Overview",
          icon: LayoutDashboard,
          href: "/app",
          roles: ["admin"],
        },
        {
          label: "User Management",
          icon: UserCog,
          href: "/app/users",
          roles: ["admin"],
          badge: 48,
          badgeVariant: "inactive",
        },
        {
          label: "Organization Settings",
          icon: Settings,
          href: "/app/settings",
          roles: ["admin"],
        },
      ],
    },
    {
      groupTitle: "Security & Infrastructure",
      items: [
        {
          label: "IT Tickets & Nodes",
          icon: Terminal,
          href: "/app/it-tickets",
          roles: ["admin"],
          badge: 3,
          badgeVariant: "pending",
        },
        {
          label: "Policy & Documents",
          icon: FileText,
          href: "/app/documents",
          roles: ["admin"],
        },
        {
          label: "AI Model Tuning",
          icon: Bot,
          href: "/app/chat",
          roles: ["admin"],
        },
      ],
    },
  ],

  it_support: [
    {
      groupTitle: "Support Console",
      items: [
        {
          label: "Dashboard",
          icon: LayoutDashboard,
          href: "/app",
          roles: ["it_support"],
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
          label: "Support Chat",
          icon: MessageSquare,
          href: "/app/chat",
          roles: ["it_support"],
        },
      ],
    },
  ],
}

export function getNavigationGroupsForRole(role: UserRole): NavGroup[] {
  if (role === "super_admin") return NAVIGATION_GROUPS.admin ?? []
  return NAVIGATION_GROUPS[role] ?? NAVIGATION_GROUPS.employee ?? []
}
