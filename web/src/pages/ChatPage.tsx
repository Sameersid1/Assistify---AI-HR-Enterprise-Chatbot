import React, { useEffect, useRef, useState } from "react"
import { Send, Sparkles, Bot, User, Loader2, AlertCircle, Wrench } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { api, ApiError } from "@/lib/api"
import { useAuth } from "@/context/AuthContext"
import type { ChatMessage, ChatRequest, ChatResponse } from "@/lib/types"

interface DisplayMessage extends ChatMessage {
  id: string
  timestamp: string
  /** Assistant turns only — which tools produced the answer. */
  toolsUsed?: string[]
}

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
}

const SUGGESTIONS = [
  "How many leave days do I have left?",
  "What is the company leave policy?",
  "Show me my leave requests",
]

const now = () =>
  new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })

export const ChatPage: React.FC = () => {
  const { user } = useAuth()
  const [messages, setMessages] = useState<DisplayMessage[]>([])
  const [inputVal, setInputVal] = useState("")
  const [isThinking, setIsThinking] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const scrollAnchor = useRef<HTMLDivElement>(null)

  // Keep the newest turn in view as the transcript grows.
  useEffect(() => {
    scrollAnchor.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages, isThinking])

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
    const transcript: ChatMessage[] = [
      ...messages.map((m) => ({ role: m.role, content: m.content })),
      { role: "user", content: question },
    ]

    setMessages((prev) => [...prev, userTurn])
    setInputVal("")
    setErrorMessage(null)
    setIsThinking(true)

    try {
      const res = await api.post<ChatResponse>("/chat", {
        messages: transcript,
      } satisfies ChatRequest)

      setMessages((prev) => [
        ...prev,
        {
          id: `a-${Date.now()}`,
          role: "assistant",
          content: res.reply,
          toolsUsed: res.toolsUsed,
          timestamp: now(),
        },
      ])
    } catch (err) {
      // The question stays on screen so it can be retried without retyping.
      setErrorMessage(
        err instanceof ApiError
          ? err.code === "AI_NOT_CONFIGURED"
            ? "The assistant isn't switched on for this server yet."
            : err.message
          : "Could not reach the assistant. Please try again.",
      )
    } finally {
      setIsThinking(false)
    }
  }

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
              Answers from your live HR records
            </p>
          </div>
        </div>
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
                className={`rounded-lg px-4 py-2.5 text-xs leading-relaxed whitespace-pre-wrap ${
                  msg.role === "user"
                    ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                    : "border border-zinc-200 bg-zinc-50 text-zinc-900 dark:border-zinc-800 dark:bg-zinc-800/80 dark:text-zinc-100"
                }`}
              >
                {msg.content}
              </div>

              {/* Where the answer came from — real tool calls, not a label. */}
              {msg.toolsUsed && msg.toolsUsed.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {[...new Set(msg.toolsUsed)].map((tool) => (
                    <span
                      key={tool}
                      className="inline-flex items-center gap-1.5 rounded-md border border-zinc-200 bg-white px-2 py-0.5 text-[11px] text-zinc-600 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
                    >
                      <Wrench className="h-3 w-3 text-indigo-600 dark:text-indigo-400" />
                      <span>{TOOL_LABELS[tool] ?? tool}</span>
                    </span>
                  ))}
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

        {isThinking && (
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
        <Button
          type="submit"
          size="sm"
          disabled={isThinking || !inputVal.trim()}
          className="h-10 bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-60 px-4"
        >
          <Send className="h-4 w-4 mr-1.5" />
          <span>Send</span>
        </Button>
      </form>
    </div>
  )
}
