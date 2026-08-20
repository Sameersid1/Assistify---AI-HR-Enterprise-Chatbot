import React, { useCallback, useEffect, useState } from "react"
import {
  MessageSquareQuote,
  Loader2,
  AlertCircle,
  Inbox,
  Send,
  CheckCircle2,
  Clock,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { api, ApiError } from "@/lib/api"
import { useAuth } from "@/context/AuthContext"
import { useLiveRefresh } from "@/lib/useLiveRefresh"
import type { CompanyQuestion } from "@/lib/types"

/**
 * Questions the assistant could not answer, and HR's replies.
 *
 * One page, two readings of it. An approver sees the queue and answers; anyone
 * else sees only what they asked themselves. Which one you get is decided by
 * the endpoint the server lets you call, not by a flag in here — an employee
 * hitting GET /questions is refused by the route guard.
 */

const ANSWERER_ROLES = new Set(["hr", "admin", "super_admin"])

const when = (iso: string) => {
  const diff = Date.now() - new Date(iso).getTime()
  const hours = Math.floor(diff / 3_600_000)
  if (hours < 1) return "just now"
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return days === 1 ? "yesterday" : `${days} days ago`
}

const initials = (name: string) =>
  name.split(" ").filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase()).join("")

export const QuestionsPage: React.FC = () => {
  const { user } = useAuth()
  const canAnswer = user ? ANSWERER_ROLES.has(user.role) : false

  const [questions, setQuestions] = useState<CompanyQuestion[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [drafts, setDrafts] = useState<Record<string, string>>({})
  const [sending, setSending] = useState<string | null>(null)

  const load = useCallback(async () => {
    try {
      const res = await api.get<{ questions: CompanyQuestion[] }>(
        canAnswer ? "/questions" : "/questions/mine",
      )
      setQuestions(res.questions)
    } catch (err) {
      setQuestions([])
      setError(err instanceof ApiError ? err.message : "Could not load questions.")
    }
  }, [canAnswer])

  useEffect(() => {
    void load()
  }, [load])

  // An answer written in another window shows up on returning to this tab.
  useLiveRefresh(load)

  const answer = async (id: string) => {
    const text = (drafts[id] ?? "").trim()
    if (!text) return
    setSending(id)
    setError(null)
    try {
      await api.post(`/questions/${id}/answer`, { answer: text })
      setDrafts((d) => ({ ...d, [id]: "" }))
      await load()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not send that answer.")
    } finally {
      setSending(null)
    }
  }

  const open = questions?.filter((q) => q.status === "OPEN") ?? []
  const answered = questions?.filter((q) => q.status === "ANSWERED") ?? []

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
          {canAnswer ? "Questions for HR" : "My Questions"}
        </h1>
        <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
          {canAnswer
            ? "Questions the assistant could not answer, sent on by the person who asked."
            : "Questions you asked the assistant to pass on to HR."}
        </p>
      </div>

      {error && (
        <Alert variant="destructive" className="py-2.5">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="text-xs">{error}</AlertDescription>
        </Alert>
      )}

      {questions === null ? (
        <div className="flex items-center justify-center gap-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 py-16 text-xs text-zinc-500">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span>Loading…</span>
        </div>
      ) : questions.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 py-16 text-center">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-zinc-100 dark:bg-zinc-800 text-zinc-400">
            <Inbox className="h-5 w-5" />
          </div>
          <div>
            <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
              Nothing here
            </p>
            <p className="text-xs text-zinc-500 mt-0.5 max-w-sm">
              {canAnswer
                ? "When the assistant cannot answer something, the person can send it here."
                : "Ask the assistant something it cannot answer, and it will offer to send it to HR."}
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {[
            { key: "open", label: canAnswer ? "Waiting for a reply" : "Waiting on HR", items: open },
            { key: "answered", label: "Answered", items: answered },
          ]
            .filter((g) => g.items.length > 0)
            .map((group) => (
              <section key={group.key} className="space-y-3">
                <h2 className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                  {group.key === "open" ? (
                    <Clock className="h-3.5 w-3.5" />
                  ) : (
                    <CheckCircle2 className="h-3.5 w-3.5" />
                  )}
                  {group.label}
                  <span className="font-mono font-normal text-zinc-400">
                    ({group.items.length})
                  </span>
                </h2>

                <div className="space-y-3">
                  {group.items.map((q) => (
                    <article
                      key={q.id}
                      className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4 space-y-3"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="flex items-start gap-3 min-w-0">
                          {q.askedBy && (
                            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-indigo-100 dark:bg-indigo-950/60 text-[10px] font-bold text-indigo-700 dark:text-indigo-300">
                              {initials(q.askedBy.fullName)}
                            </div>
                          )}
                          <div className="min-w-0 space-y-0.5">
                            <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                              {q.question}
                            </p>
                            <p className="text-[11px] text-zinc-500">
                              {q.askedBy ? `${q.askedBy.fullName} · ` : ""}
                              {q.askedBy?.department ? `${q.askedBy.department} · ` : ""}
                              {when(q.createdAt)}
                            </p>
                          </div>
                        </div>
                        <Badge
                          variant={q.status === "OPEN" ? "pending" : "active"}
                          className="text-[10px] py-0 px-2 font-mono shrink-0"
                        >
                          {q.status}
                        </Badge>
                      </div>

                      {/* Why the assistant could not answer — so HR closes the
                          gap instead of repeating the refusal. */}
                      {q.assistantNote && (
                        <p className="rounded-lg border border-zinc-100 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/50 px-3 py-2 text-[11px] text-zinc-600 dark:text-zinc-400">
                          <span className="font-semibold">The assistant said:</span>{" "}
                          {q.assistantNote}
                        </p>
                      )}

                      {q.status === "ANSWERED" ? (
                        <div className="rounded-lg border border-emerald-200 dark:border-emerald-900/60 bg-emerald-50/60 dark:bg-emerald-950/30 px-3 py-2.5 space-y-1">
                          <p className="text-xs text-zinc-800 dark:text-zinc-200 whitespace-pre-wrap">
                            {q.answer}
                          </p>
                          <p className="text-[11px] text-zinc-500">
                            {q.answeredBy?.fullName ? `${q.answeredBy.fullName} · ` : ""}
                            {q.answeredAt ? when(q.answeredAt) : ""}
                          </p>
                        </div>
                      ) : canAnswer ? (
                        <div className="space-y-2">
                          <Textarea
                            rows={3}
                            value={drafts[q.id] ?? ""}
                            onChange={(e) =>
                              setDrafts((d) => ({ ...d, [q.id]: e.target.value }))
                            }
                            placeholder="Write the answer. They will be notified."
                            className="text-xs"
                          />
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-[11px] text-zinc-400">
                              If this comes up often, publish it as a policy document so
                              the assistant can answer it next time.
                            </span>
                            <Button
                              size="sm"
                              disabled={sending === q.id || !(drafts[q.id] ?? "").trim()}
                              onClick={() => void answer(q.id)}
                              className="h-8 shrink-0 gap-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white text-xs"
                            >
                              {sending === q.id ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              ) : (
                                <Send className="h-3.5 w-3.5" />
                              )}
                              Send answer
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <p className="text-[11px] text-zinc-500">
                          HR has not replied yet. You will be notified when they do.
                        </p>
                      )}
                    </article>
                  ))}
                </div>
              </section>
            ))}
        </div>
      )}

      {questions !== null && questions.length > 0 && (
        <p className="flex items-center gap-1.5 text-[11px] text-zinc-400">
          <MessageSquareQuote className="h-3.5 w-3.5" />
          The assistant only sends a question here when the person agrees to it.
        </p>
      )}
    </div>
  )
}
