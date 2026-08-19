import React, { useCallback, useEffect, useMemo, useState } from "react"
import {
  UserCog,
  Plus,
  Search,
  Mail,
  Loader2,
  AlertCircle,
  Inbox,
  Send,
  Ban,
  RotateCcw,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { InviteStaffModal } from "@/components/modals/InviteStaffModal"
import { api, ApiError } from "@/lib/api"
import type { ApiUser, UserRole, UserStatus } from "@/lib/types"

const ROLE_LABELS: Record<UserRole, string> = {
  employee: "Employee",
  hr: "HR Manager",
  it_support: "IT Support",
  admin: "Administrator",
  super_admin: "Super Administrator",
}

const STATUS_VARIANT: Record<UserStatus, "active" | "pending" | "inactive"> = {
  ACTIVE: "active",
  INVITED: "pending",
  DEACTIVATED: "inactive",
}

const initials = (name: string) =>
  name.split(" ").filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase()).join("")

export const UsersPage: React.FC = () => {
  const [users, setUsers] = useState<ApiUser[] | null>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  /** Id of the account mid-action, so only that row's buttons disable. */
  const [busy, setBusy] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  const load = useCallback(async () => {
    try {
      const res = await api.get<{ users: ApiUser[] }>("/users")
      setUsers(res.users)
    } catch (err) {
      setUsers([])
      setError(err instanceof ApiError ? err.message : "Could not load accounts.")
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const filtered = useMemo(() => {
    if (!users) return null
    const q = searchTerm.trim().toLowerCase()
    if (!q) return users
    return users.filter((u) =>
      [u.fullName, u.email, ROLE_LABELS[u.role]].some((f) =>
        String(f).toLowerCase().includes(q),
      ),
    )
  }, [users, searchTerm])

  /** Shared handler — the three actions differ only by path and confirmation. */
  const act = async (
    user: ApiUser,
    action: "resend-invitation" | "deactivate" | "reactivate",
    confirm?: string,
  ) => {
    if (confirm && !window.confirm(confirm)) return
    setBusy(user.id)
    setError(null)
    setNotice(null)
    try {
      await api.post(`/users/${user.id}/${action}`)
      if (action === "resend-invitation") {
        setNotice(`A fresh activation link has been sent to ${user.fullName}.`)
      }
      await load()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "That action failed.")
    } finally {
      setBusy(null)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
            User Management
          </h1>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
            {users === null
              ? "Loading…"
              : `${users.length} ${users.length === 1 ? "account" : "accounts"} in your organisation`}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative w-full sm:w-56">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-400" />
            <Input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search accounts"
              className="h-9 pl-9 text-xs"
            />
          </div>
          <Button
            size="sm"
            onClick={() => setIsInviteModalOpen(true)}
            className="h-9 gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs shrink-0"
          >
            <Plus className="h-3.5 w-3.5" />
            Invite Staff
          </Button>
        </div>
      </div>

      {error && (
        <Alert variant="destructive" className="py-2.5">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="text-xs">{error}</AlertDescription>
        </Alert>
      )}
      {notice && (
        <Alert className="py-2.5">
          <Send className="h-4 w-4" />
          <AlertDescription className="text-xs">{notice}</AlertDescription>
        </Alert>
      )}

      {filtered === null ? (
        <div className="flex items-center justify-center gap-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 py-16 text-xs text-zinc-500">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span>Loading accounts…</span>
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 py-16 text-center">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-zinc-100 dark:bg-zinc-800 text-zinc-400">
            <Inbox className="h-5 w-5" />
          </div>
          <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
            {searchTerm ? "No accounts match that" : "No accounts yet"}
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
          {filtered.map((user, i) => (
            <div
              key={user.id}
              className={`flex flex-wrap items-center justify-between gap-4 p-4 ${
                i > 0 ? "border-t border-zinc-100 dark:border-zinc-800" : ""
              }`}
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-indigo-100 dark:bg-indigo-950/60 text-[11px] font-bold text-indigo-700 dark:text-indigo-300">
                  {initials(user.fullName)}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 truncate">
                    {user.fullName}
                  </p>
                  <p className="inline-flex items-center gap-1.5 text-[11px] text-zinc-500 truncate">
                    <Mail className="h-3 w-3" />
                    {user.email}
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline" className="text-[10px] py-0 px-1.5">
                  {ROLE_LABELS[user.role]}
                </Badge>
                <Badge
                  variant={STATUS_VARIANT[user.status]}
                  className="text-[10px] py-0 px-1.5 font-mono"
                >
                  {user.status}
                </Badge>

                {/* Only offered where the server would accept it: a resend needs
                    an unactivated account, a reactivate needs a deactivated one. */}
                {user.status === "INVITED" && (
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={busy === user.id}
                    onClick={() => void act(user, "resend-invitation")}
                    className="h-7 gap-1.5 text-[11px]"
                  >
                    {busy === user.id ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <Send className="h-3 w-3" />
                    )}
                    Resend invite
                  </Button>
                )}
                {user.status === "ACTIVE" && (
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={busy === user.id}
                    onClick={() =>
                      void act(
                        user,
                        "deactivate",
                        `Deactivate ${user.fullName}? They will be signed out everywhere and cannot sign back in.`,
                      )
                    }
                    className="h-7 gap-1.5 text-[11px] text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                  >
                    <Ban className="h-3 w-3" />
                    Deactivate
                  </Button>
                )}
                {user.status === "DEACTIVATED" && (
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={busy === user.id}
                    onClick={() => void act(user, "reactivate")}
                    className="h-7 gap-1.5 text-[11px]"
                  >
                    <RotateCcw className="h-3 w-3" />
                    Reactivate
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {users !== null && (
        <p className="flex items-center gap-1.5 text-[11px] text-zinc-400">
          <UserCog className="h-3.5 w-3.5" />
          Accounts are deactivated, never deleted, so their leave history stays intact.
        </p>
      )}

      <InviteStaffModal
        isOpen={isInviteModalOpen}
        onClose={() => setIsInviteModalOpen(false)}
        onInviteStaff={() => void load()}
      />
    </div>
  )
}
