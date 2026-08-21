import React, { useCallback, useEffect, useState } from "react"
import {
  ScrollText,
  Loader2,
  AlertCircle,
  Inbox,
  CalendarCheck,
  CalendarX,
  UserPlus,
  UserMinus,
  UserCheck,
  FileText,
  FileX,
  MessageSquareQuote,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { api, ApiError } from "@/lib/api"
import { useLiveRefresh } from "@/lib/useLiveRefresh"
import type { AuditLogEntry } from "@/lib/types"

/**
 * The audit trail.
 *
 * Administrators only, and deliberately not HR — HR appears *in* this log, and
 * letting the people a record is about decide what it says defeats the purpose.
 */

const ICONS: Record<string, React.ElementType> = {
  LEAVE_APPROVED: CalendarCheck,
  LEAVE_REJECTED: CalendarX,
  USER_INVITED: UserPlus,
  USER_DEACTIVATED: UserMinus,
  USER_REACTIVATED: UserCheck,
  DOCUMENT_PUBLISHED: FileText,
  DOCUMENT_DELETED: FileX,
  QUESTION_ANSWERED: MessageSquareQuote,
}

/** Green for things granted, red for things withdrawn, neutral otherwise. */
const TONE: Record<string, string> = {
  LEAVE_APPROVED: "text-emerald-600 dark:text-emerald-400",
  USER_REACTIVATED: "text-emerald-600 dark:text-emerald-400",
  LEAVE_REJECTED: "text-rose-600 dark:text-rose-400",
  USER_DEACTIVATED: "text-rose-600 dark:text-rose-400",
  DOCUMENT_DELETED: "text-rose-600 dark:text-rose-400",
}

const ACTION_LABELS: Record<string, string> = {
  LEAVE_APPROVED: "Leave approved",
  LEAVE_REJECTED: "Leave rejected",
  USER_INVITED: "User invited",
  USER_DEACTIVATED: "Account deactivated",
  USER_REACTIVATED: "Account reactivated",
  DOCUMENT_PUBLISHED: "Policy published",
  DOCUMENT_DELETED: "Policy deleted",
  QUESTION_ANSWERED: "Question answered",
}

const stamp = (iso: string) =>
  new Date(iso).toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })

export const AuditLogPage: React.FC = () => {
  const [logs, setLogs] = useState<AuditLogEntry[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    try {
      const res = await api.get<{ logs: AuditLogEntry[] }>("/audit")
      setLogs(res.logs)
    } catch (err) {
      setLogs([])
      setError(err instanceof ApiError ? err.message : "Could not load the audit trail.")
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])
  useLiveRefresh(load)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
          Audit Trail
        </h1>
        <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
          Every decision that changed someone&apos;s record — who did it, to whom, and when.
        </p>
      </div>

      {error && (
        <Alert variant="destructive" className="py-2.5">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="text-xs">{error}</AlertDescription>
        </Alert>
      )}

      {logs === null ? (
        <div className="flex items-center justify-center gap-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 py-16 text-xs text-zinc-500">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span>Loading…</span>
        </div>
      ) : logs.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 py-16 text-center">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-zinc-100 dark:bg-zinc-800 text-zinc-400">
            <Inbox className="h-5 w-5" />
          </div>
          <div>
            <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
              Nothing recorded yet
            </p>
            <p className="text-xs text-zinc-500 mt-0.5 max-w-sm">
              Approving leave, inviting someone or publishing a policy will appear here.
            </p>
          </div>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
          {logs.map((log, i) => {
            const Icon = ICONS[log.action] ?? ScrollText
            return (
              <div
                key={log.id}
                className={`flex items-start gap-3 p-4 ${
                  i > 0 ? "border-t border-zinc-100 dark:border-zinc-800" : ""
                }`}
              >
                <div
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-zinc-100 dark:bg-zinc-800 ${
                    TONE[log.action] ?? "text-zinc-500 dark:text-zinc-400"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                </div>

                <div className="min-w-0 flex-1 space-y-0.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                      {ACTION_LABELS[log.action] ?? log.action}
                    </span>
                    <Badge variant="outline" className="text-[10px] py-0 px-1.5">
                      {log.actorRole}
                    </Badge>
                  </div>
                  <p className="text-xs text-zinc-600 dark:text-zinc-400">{log.summary}</p>
                  <p className="text-[11px] text-zinc-400">
                    {log.actorName}
                    {log.targetName ? ` → ${log.targetName}` : ""} · {stamp(log.createdAt)}
                  </p>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {logs !== null && (
        <p className="flex items-center gap-1.5 text-[11px] text-zinc-400">
          <ScrollText className="h-3.5 w-3.5" />
          Entries are never edited or deleted. Names are recorded as they were at the time,
          so the trail still reads correctly after someone is renamed or deactivated.
        </p>
      )}
    </div>
  )
}
