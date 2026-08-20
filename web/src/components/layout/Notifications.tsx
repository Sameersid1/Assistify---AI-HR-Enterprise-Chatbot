import React, { useCallback, useEffect, useState } from "react"
import { Link } from "react-router-dom"
import { Bell, Inbox } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useAuth } from "@/context/AuthContext"
import { api } from "@/lib/api"
import { useLiveRefresh } from "@/lib/useLiveRefresh"
import { LEAVE_TYPE_LABELS, type CompanyQuestion, type LeaveRequest } from "@/lib/types"

/**
 * Notifications, from the database.
 *
 * This used to be a hardcoded "2 New" badge over a hardcoded "Rohan Patel
 * requested 3 days Casual Leave" — shown to every account, on every page, for
 * ever. It survived the fake-data clearout because Rohan Patel is a real seeded
 * user, so searching for invented names did not find it. The permanent unread
 * dot is the part that actually misleads: a badge that is always lit tells you
 * nothing, and trains people to ignore the one time it means something.
 *
 * What is worth telling someone differs by what they can act on:
 *   approvers  — requests waiting on their decision
 *   everyone   — decisions made on their own requests
 */

const RECENT_DAYS = 14

interface Item {
  id: string
  title: string
  detail: string
  when: string
  href: string
}

const APPROVER_ROLES = new Set(["hr", "admin", "super_admin"])

const formatDate = (iso: string) =>
  new Date(`${iso}T00:00:00.000Z`).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    timeZone: "UTC",
  })

const relative = (iso: string): string => {
  const diff = Date.now() - new Date(iso).getTime()
  const hours = Math.floor(diff / 3_600_000)
  if (hours < 1) return "just now"
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return days === 1 ? "yesterday" : `${days}d ago`
}

export const Notifications: React.FC = () => {
  const { user } = useAuth()
  const [items, setItems] = useState<Item[]>([])

  const load = useCallback(async () => {
    if (!user) return
    {
      const next: Item[] = []

      if (APPROVER_ROLES.has(user.role)) {
        try {
          const res = await api.get<{ requests: LeaveRequest[] }>(
            "/leave/requests?status=PENDING",
          )
          for (const r of res.requests) {
            next.push({
              id: r.id,
              title: "Leave request awaiting your decision",
              detail: `${r.employee?.fullName ?? "Someone"} — ${r.days} day${r.days === 1 ? "" : "s"} ${LEAVE_TYPE_LABELS[r.type]}, ${formatDate(r.fromDate)}`,
              when: relative(r.createdAt),
              href: "/app/leave-approvals",
            })
          }
        } catch {
          // A failed fetch shows nothing rather than a stale or invented count.
        }
      }

      if (APPROVER_ROLES.has(user.role)) {
        try {
          const res = await api.get<{ questions: CompanyQuestion[] }>("/questions?status=OPEN")
          for (const q of res.questions) {
            next.push({
              id: `q-${q.id}`,
              title: "Question waiting for an answer",
              detail: `${q.askedBy?.fullName ?? "Someone"} asked: ${q.question}`,
              when: relative(q.createdAt),
              href: "/app/questions",
            })
          }
        } catch {
          /* same */
        }
      }

      try {
        const res = await api.get<{ requests: LeaveRequest[] }>("/leave/my-requests")
        const cutoff = Date.now() - RECENT_DAYS * 86_400_000
        for (const r of res.requests) {
          if (!r.decidedAt || new Date(r.decidedAt).getTime() < cutoff) continue
          next.push({
            id: `own-${r.id}`,
            title: `Your leave was ${r.status.toLowerCase()}`,
            detail: `${r.days} day${r.days === 1 ? "" : "s"} ${LEAVE_TYPE_LABELS[r.type]} from ${formatDate(r.fromDate)}${r.decisionNote ? ` — "${r.decisionNote}"` : ""}`,
            when: relative(r.decidedAt),
            href: "/app",
          })
        }
      } catch {
        /* same */
      }

      // The other half of the loop: HR answered something you asked.
      try {
        const res = await api.get<{ questions: CompanyQuestion[] }>("/questions/mine")
        const cutoff = Date.now() - RECENT_DAYS * 86_400_000
        for (const q of res.questions) {
          if (q.status !== "ANSWERED" || !q.answeredAt) continue
          if (new Date(q.answeredAt).getTime() < cutoff) continue
          next.push({
            id: `qa-${q.id}`,
            title: "HR answered your question",
            detail: q.answer ?? q.question,
            when: relative(q.answeredAt),
            href: "/app/questions",
          })
        }
      } catch {
        /* same */
      }

      setItems(next.slice(0, 8))
    }
  }, [user])

  useEffect(() => {
    void load()
  }, [load])

  // Re-read on returning to the tab, so an answer written in another window is
  // already here rather than waiting for a reload.
  useLiveRefresh(load)

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="icon-sm"
          className="relative h-8.5 w-8.5 rounded-lg border-zinc-200 text-zinc-700 hover:text-zinc-900 dark:border-zinc-800 dark:text-zinc-300 dark:hover:text-white"
          aria-label={
            items.length ? `Notifications, ${items.length} waiting` : "Notifications"
          }
        >
          <Bell className="h-4.5 w-4.5" />
          {/* Lit only when there is genuinely something here. */}
          {items.length > 0 && (
            <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-indigo-600 ring-2 ring-white dark:ring-zinc-950" />
          )}
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-80 p-2">
        <div className="flex items-center justify-between px-2.5 py-1.5">
          <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
            Notifications
          </span>
          {items.length > 0 && (
            <Badge variant="default" className="text-xs py-0.5 px-2 font-mono">
              {items.length}
            </Badge>
          )}
        </div>
        <DropdownMenuSeparator />

        {items.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-7 text-center">
            <Inbox className="h-5 w-5 text-zinc-400" />
            <p className="text-xs text-zinc-500">Nothing needs your attention.</p>
          </div>
        ) : (
          <div className="space-y-1 py-1">
            {items.map((item) => (
              <Link
                key={item.id}
                to={item.href}
                className="block space-y-0.5 rounded-lg p-2.5 text-xs hover:bg-zinc-50 dark:hover:bg-zinc-800/60"
              >
                <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                  {item.title}
                </p>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">{item.detail}</p>
                <span className="text-[11px] text-zinc-400">{item.when}</span>
              </Link>
            ))}
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
