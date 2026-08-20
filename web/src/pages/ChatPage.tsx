import React, { useEffect, useRef, useState } from "react"
import { Send, Sparkles, Bot, User, Loader2, AlertCircle, Wrench, PenLine, Trash2, Square } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { api, ApiError } from "@/lib/api"
import { useAuth } from "@/context/AuthContext"
import { renderMarkdown } from "@/lib/markdown"
import type { ChatMessage, ChatRequest } from "@/lib/types"

interface DisplayMessage extends ChatMessage {
  id: string
  timestamp: string
  /** Assistant turns only — which tools produced the answer. */
  toolsUsed?: string[]
  /** True while this turn is still being written. Never persisted. */
  streaming?: boolean
}

/** One frame from POST /chat/stream. Mirrors ChatStreamEvent on the server. */
type ChatStreamEvent =
  | { type: "tool"; name: string }
  | { type: "delta"; text: string }
  | { type: "discard" }
  | { type: "done"; toolsUsed: string[] }
  | { type: "error"; code: string; message: string }

/**
 * Tool names are API identifiers; these are what a person should see. An
 * unmapped name falls back to the raw identifier rather than being hidden, so a
 * newly added tool is visibly unlabelled instead of silently invisible.
 */
const TOOL_LABELS: Record<string, string> = {
  get_my_leave_balance: "Your leave balance",
  list_my_leave_requests: "Your leave requests",
  get_company_leave_policy: "Company leave policy",
  list_company_leave_requests: "Company leave requests",
  list_employees: "Employee directory",
  search_company_policies: "Company policy documents",
  apply_for_leave: "Submitted a leave request",
  cancel_my_leave_request: "Cancelled a leave request",
}

/**
 * Tools that changed something. Their chips are marked differently so a write
 * is never mistaken for a lookup while skim-reading a transcript.
 */
const WRITE_TOOLS = new Set(["apply_for_leave", "cancel_my_leave_request"])

const SUGGESTIONS = [
  "How many leave days do I have left?",
  "What is the company leave policy?",
  "Show me my leave requests",
  "Apply for 1 day casual leave next Monday",
  "What does the policy say about notice periods?",
]

const now = () =>
  new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })

/**
 * The transcript survives a reload, kept per user so a shared machine never
 * shows one person's conversation to the next.
 *
 * localStorage rather than the database on purpose: this is convenience, not
 * a record. The server is stateless by design — it re-reads every fact through
 * a tool on each turn — so a lost transcript costs nothing but retyping, and
 * storing HR conversations server-side would be a retention decision nobody has
 * made.
 */
const storageKey = (userId: string) => `assistify.chat.${userId}`

function loadTranscript(userId: string): DisplayMessage[] {
  try {
    const raw = localStorage.getItem(storageKey(userId))
    if (!raw) return []
    const parsed: unknown = JSON.parse(raw)
    // Anything could be in localStorage — an old shape from a previous build,
    // or something a user edited. Validate rather than trust it into state.
    if (!Array.isArray(parsed)) return []
    return parsed.filter(
      (m): m is DisplayMessage =>
        !!m &&
        typeof m === "object" &&
        typeof (m as DisplayMessage).content === "string" &&
        (m as DisplayMessage).content.trim().length > 0 &&
        ((m as DisplayMessage).role === "user" ||
          (m as DisplayMessage).role === "assistant"),
    )
  } catch {
    return []
  }
}

export const ChatPage: React.FC = () => {
  const { user } = useAuth()
  const [messages, setMessages] = useState<DisplayMessage[]>([])
  const [inputVal, setInputVal] = useState("")
  const [isThinking, setIsThinking] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const scrollAnchor = useRef<HTMLDivElement>(null)
  /** Aborts the answer in progress. Null when nothing is streaming. */
  const abortRef = useRef<AbortController | null>(null)

  /**
   * Which user's transcript is currently in `messages`.
   *
   * Without this the save effect can run before the load effect has put
   * anything in state — on a remount, or on the render where the user first
   * resolves — and write an empty array straight over the saved conversation.
   * Saving is allowed only once the state is known to belong to this user.
   */
  const hydratedFor = useRef<string | null>(null)

  // Restore on mount, and whenever the signed-in user changes.
  useEffect(() => {
    hydratedFor.current = user?.id ?? null
    setMessages(user?.id ? loadTranscript(user.id) : [])
  }, [user?.id])

  // Leaving the page mid-answer stops the request. Without this the stream
  // keeps running against an unmounted component — writing into state nobody
  // renders, and spending API quota on an answer that can never be read.
  useEffect(() => () => abortRef.current?.abort(), [])

  // Persist after every completed turn. Skipped while a reply is streaming:
  // writing on each delta would hit localStorage once per token, and a
  // half-written answer is not worth restoring.
  const isStreaming = messages.some((m) => m.streaming)
  useEffect(() => {
    // hydratedFor: never write one user's conversation under another's key
    // during the render where the signed-in user is changing.
    if (!user?.id || isStreaming || hydratedFor.current !== user.id) return
    try {
      const key = storageKey(user.id)
      // An empty transcript never overwrites a saved one. On a remount the save
      // effect can run against empty state before the load effect's setMessages
      // has landed, and that wrote a blank array over a real conversation.
      // Clearing the chat calls removeItem directly, so it is unaffected.
      if (messages.length === 0 && (localStorage.getItem(key)?.length ?? 0) > 2) return
      // `streaming` is transient state, never storage.
      const persistable = messages.map(({ streaming: _s, ...rest }) => rest)
      localStorage.setItem(key, JSON.stringify(persistable))
    } catch {
      // Quota exceeded or storage disabled — the chat still works in memory.
    }
  }, [messages, user?.id, isStreaming])

  // Keep the newest turn in view as the transcript grows.
  useEffect(() => {
    scrollAnchor.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages, isThinking])

  const clearChat = () => {
    // Stop an answer in flight first — otherwise its remaining text lands in a
    // conversation the person just cleared.
    abortRef.current?.abort()
    setMessages([])
    setErrorMessage(null)
    if (user?.id) localStorage.removeItem(storageKey(user.id))
  }

  const send = async (text: string) => {
    const question = text.trim()
    if (!question || isThinking) return

    const userTurn: DisplayMessage = {
      id: `u-${Date.now()}`,
      role: "user",
      content: question,
      timestamp: now(),
    }

    // Snapshot the transcript we are about to send. Reading `messages` inside
    // the request would race the state update above.
    // Empty turns are dropped: a reply that was stopped before any text
    // arrived leaves a blank bubble, and the server's schema rejects an empty
    // message with a 400 that would take the whole next question down with it.
    const transcript: ChatMessage[] = [
      ...messages
        .filter((m) => m.content.trim())
        .map((m) => ({ role: m.role, content: m.content })),
      { role: "user", content: question },
    ]

    // The bubble the answer is written into. It goes up empty so the reply
    // appears where the reader is already looking, rather than arriving all at
    // once somewhere below.
    const replyId = `a-${Date.now()}`

    setMessages((prev) => [
      ...prev,
      userTurn,
      { id: replyId, role: "assistant", content: "", timestamp: now(), streaming: true },
    ])
    setInputVal("")
    setErrorMessage(null)
    setIsThinking(true)

    const controller = new AbortController()
    abortRef.current = controller

    // Set by an `error` frame — an error is delivered inside a healthy stream,
    // so it cannot be thrown from here and caught below.
    let failed: string | null = null

    const patch = (fn: (m: DisplayMessage) => DisplayMessage) =>
      setMessages((prev) => prev.map((m) => (m.id === replyId ? fn(m) : m)))

    try {
      await api.stream(
        "/chat/stream",
        { messages: transcript } satisfies ChatRequest,
        (raw) => {
          const event = raw as ChatStreamEvent
          switch (event.type) {
            case "delta":
              patch((m) => ({ ...m, content: m.content + event.text }))
              break
            case "tool":
              patch((m) => ({ ...m, toolsUsed: [...(m.toolsUsed ?? []), event.name] }))
              break
            case "discard":
              // That text was the model talking itself into a tool call, not
              // the answer. Clear it and let the real reply start clean.
              patch((m) => ({ ...m, content: "" }))
              break
            case "done":
              patch((m) => ({ ...m, toolsUsed: event.toolsUsed, streaming: false }))
              break
            case "error":
              failed =
                event.code === "AI_NOT_CONFIGURED"
                  ? "The assistant isn't switched on for this server yet."
                  : event.message
              break
          }
        },
        controller.signal,
      )
    } catch (err) {
      failed =
        err instanceof ApiError
          ? err.code === "AI_NOT_CONFIGURED"
            ? "The assistant isn't switched on for this server yet."
            : err.message
          : "Could not reach the assistant. Please try again."
    } finally {
      abortRef.current = null
      setIsThinking(false)

      // An empty reply bubble is never worth keeping, whether it ended in an
      // error or was stopped before the first token. The question stays on
      // screen either way, so it can be retried without retyping.
      setMessages((prev) => prev.filter((m) => !(m.id === replyId && !m.content.trim())))
      // Stopped mid-answer, or the stream died after some text arrived: keep
      // what was written and stop the cursor blinking on it.
      patch((m) => ({ ...m, streaming: false }))
      if (failed) setErrorMessage(failed)
    }
  }

  /** Abandon the answer in progress; whatever has been written so far stays. */
  const stopStreaming = () => abortRef.current?.abort()

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    void send(inputVal)
  }

  return (
    <div className="flex h-[calc(100vh-8rem)] flex-col rounded-lg border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900 overflow-hidden">
      {/* Header */}
      <div className="flex h-14 items-center justify-between border-b border-zinc-200 px-6 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50">
        <div className="flex items-center gap-2.5">
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-indigo-600 text-white">
            <Sparkles className="h-4 w-4" />
          </div>
          <div>
            <h2 className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">
              Assistify Assistant
            </h2>
            <p className="text-[10px] text-zinc-500">
              Answers from your live HR records and policy documents
            </p>
          </div>
        </div>

        {messages.length > 0 && (
          <button
            type="button"
            onClick={clearChat}
            className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-[11px] text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
          >
            <Trash2 className="h-3.5 w-3.5" />
            New chat
          </button>
        )}
      </div>

      {/* Transcript */}
      <div className="flex-1 overflow-y-auto p-6 space-y-5">
        {messages.length === 0 && !isThinking && (
          <div className="flex h-full flex-col items-center justify-center gap-4 text-center">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-600 text-white">
              <Sparkles className="h-5 w-5" />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                Hello{user?.name ? `, ${user.name.split(" ")[0]}` : ""}
              </p>
              <p className="text-xs text-zinc-500 max-w-sm">
                Ask about your leave, your requests, or company policy. I read
                your actual records — I don&apos;t guess.
              </p>
            </div>
            <div className="flex flex-wrap justify-center gap-2 pt-1">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => void send(s)}
                  className="rounded-full border border-zinc-200 bg-white px-3 py-1.5 text-[11px] text-zinc-600 hover:border-indigo-300 hover:text-indigo-600 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:border-indigo-700 dark:hover:text-indigo-400 transition-colors"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex items-start gap-3 ${
              msg.role === "user" ? "justify-end" : "justify-start"
            }`}
          >
            {msg.role === "assistant" && (
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-indigo-600 text-white">
                <Bot className="h-4 w-4" />
              </div>
            )}
            <div
              className={`max-w-xl space-y-2 ${
                msg.role === "user" ? "text-right" : "text-left"
              }`}
            >
              <div
                className={`rounded-lg px-4 py-2.5 text-xs leading-relaxed ${
                  msg.role === "user"
                    ? "whitespace-pre-wrap bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                    : "border border-zinc-200 bg-zinc-50 text-zinc-900 dark:border-zinc-800 dark:bg-zinc-800/80 dark:text-zinc-100"
                }`}
              >
                {/* The assistant writes Markdown whether asked to or not, so its
                    turns are parsed. A person's own message is shown exactly as
                    they typed it — nobody expects their asterisks to vanish. */}
                {msg.role === "assistant" ? renderMarkdown(msg.content) : msg.content}
                {msg.streaming && (
                  <span className="ml-0.5 inline-block h-3 w-1.5 translate-y-px animate-pulse rounded-xs bg-indigo-500 align-middle" />
                )}
              </div>

              {/* Where the answer came from — real tool calls, not a label. */}
              {msg.toolsUsed && msg.toolsUsed.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {[...new Set(msg.toolsUsed)].map((tool) => {
                    const isWrite = WRITE_TOOLS.has(tool)
                    return (
                      <span
                        key={tool}
                        className={`inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-[11px] ${
                          isWrite
                            ? "border-emerald-300 bg-emerald-50 text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300"
                            : "border-zinc-200 bg-white text-zinc-600 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
                        }`}
                      >
                        {isWrite ? (
                          <PenLine className="h-3 w-3" />
                        ) : (
                          <Wrench className="h-3 w-3 text-indigo-600 dark:text-indigo-400" />
                        )}
                        <span>{TOOL_LABELS[tool] ?? tool}</span>
                      </span>
                    )
                  })}
                </div>
              )}

              <div className="text-[10px] text-zinc-400">{msg.timestamp}</div>
            </div>

            {msg.role === "user" && (
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-zinc-200 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-300">
                <User className="h-4 w-4" />
              </div>
            )}
          </div>
        ))}

        {isThinking && !messages.some((m) => m.streaming && m.content) && (
          <div className="flex items-center gap-3">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-indigo-600 text-white">
              <Bot className="h-4 w-4" />
            </div>
            <div className="flex items-center gap-2 rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-xs text-zinc-500 dark:border-zinc-800 dark:bg-zinc-800">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              <span>Checking your records…</span>
            </div>
          </div>
        )}

        {errorMessage && (
          <Alert variant="destructive" className="py-2.5">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="text-xs">{errorMessage}</AlertDescription>
          </Alert>
        )}

        <div ref={scrollAnchor} />
      </div>

      {/* Composer */}
      <form
        onSubmit={handleSubmit}
        className="flex items-center gap-2 border-t border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900"
      >
        <Input
          value={inputVal}
          onChange={(e) => setInputVal(e.target.value)}
          disabled={isThinking}
          placeholder="Ask about your leave, requests or company policy…"
          className="h-10 text-xs"
        />
        {isThinking ? (
          <Button
            type="button"
            size="sm"
            onClick={stopStreaming}
            className="h-10 bg-zinc-900 text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200 px-4"
          >
            <Square className="h-3.5 w-3.5 mr-1.5 fill-current" />
            <span>Stop</span>
          </Button>
        ) : (
          <Button
            type="submit"
            size="sm"
            disabled={!inputVal.trim()}
            className="h-10 bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-60 px-4"
          >
            <Send className="h-4 w-4 mr-1.5" />
            <span>Send</span>
          </Button>
        )}
      </form>
    </div>
  )
}
