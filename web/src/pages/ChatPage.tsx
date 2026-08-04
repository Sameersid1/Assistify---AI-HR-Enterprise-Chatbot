import React, { useState } from "react"
import { Send, Sparkles, BookOpen, Bot, User, CornerDownLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"

interface Message {
  id: string
  sender: "user" | "assistant"
  text: string
  citation?: string
  timestamp: string
}

export const ChatPage: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      sender: "user",
      text: "How many casual leaves do I have left for 2026?",
      timestamp: "10:14 AM",
    },
    {
      id: "2",
      sender: "assistant",
      text: "You have 8 casual leaves remaining out of 12 for the calendar year 2026.",
      citation: "Leave Policy 2026 · Section 4.2",
      timestamp: "10:14 AM",
    },
    {
      id: "3",
      sender: "user",
      text: "Can I carry forward unused leaves to next quarter?",
      timestamp: "10:15 AM",
    },
    {
      id: "4",
      sender: "assistant",
      text: "Yes. According to Nexora's policy, up to 5 unused casual leaves can be carried forward into Q3, provided your manager approves before the quarterly cut-off date.",
      citation: "Leave Policy 2026 · Section 4.5 (Rollover Rules)",
      timestamp: "10:15 AM",
    },
  ])

  const [inputVal, setInputVal] = useState("")
  const [isTyping, setIsTyping] = useState(false)

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault()
    if (!inputVal.trim()) return

    const userText = inputVal.trim()
    const newMsg: Message = {
      id: Date.now().toString(),
      sender: "user",
      text: userText,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    }

    setMessages((prev) => [...prev, newMsg])
    setInputVal("")
    setIsTyping(true)

    setTimeout(() => {
      let reply = "I've checked the latest company policies regarding your request."
      let citation = "Employee Handbook 2026 · General Provisions"

      if (userText.toLowerCase().includes("wfh") || userText.toLowerCase().includes("remote")) {
        reply = "Full-time employees are entitled to 2 remote work days per week with team lead synchronization."
        citation = "Remote Work & Hybrid Guidelines · Section 2.1"
      } else if (userText.toLowerCase().includes("health") || userText.toLowerCase().includes("insurance")) {
        reply = "Nexora covers medical insurance up to $50,000 for employees and immediate dependents."
        citation = "Benefits & Health Scheme 2026 · Group Policy A"
      } else {
        reply = `Regarding "${userText}": This is supported under Nexora's standard operations. You can initiate a formal application anytime.`
      }

      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          sender: "assistant",
          text: reply,
          citation,
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        },
      ])
      setIsTyping(false)
    }, 700)
  }

  return (
    <div className="flex h-[calc(100vh-8rem)] flex-col rounded-lg border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900 overflow-hidden">
      {/* Chat Header */}
      <div className="flex h-14 items-center justify-between border-b border-zinc-200 px-6 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50">
        <div className="flex items-center gap-2.5">
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-indigo-600 text-white">
            <Sparkles className="h-4 w-4" />
          </div>
          <div>
            <h2 className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">
              Assistify AI Assistant
            </h2>
            <p className="text-[10px] text-zinc-500">
              Grounded in 28 verified Nexora internal policies
            </p>
          </div>
        </div>
        <Badge variant="outline" className="text-[11px] font-mono">
          Model: Assistify v4.2
        </Badge>
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto p-6 space-y-5">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex items-start gap-3 ${
              msg.sender === "user" ? "justify-end" : "justify-start"
            }`}
          >
            {msg.sender === "assistant" && (
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-indigo-600 text-white">
                <Bot className="h-4 w-4" />
              </div>
            )}
            <div
              className={`max-w-xl space-y-2 ${
                msg.sender === "user" ? "text-right" : "text-left"
              }`}
            >
              <div
                className={`rounded-lg px-4 py-2.5 text-xs leading-relaxed ${
                  msg.sender === "user"
                    ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                    : "border border-zinc-200 bg-zinc-50 text-zinc-900 dark:border-zinc-800 dark:bg-zinc-800/80 dark:text-zinc-100"
                }`}
              >
                {msg.text}
              </div>

              {/* Source Chip if present */}
              {msg.citation && (
                <div className="inline-flex items-center gap-1.5 rounded-md border border-zinc-200 bg-white px-2 py-0.5 text-[11px] text-zinc-600 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
                  <BookOpen className="h-3 w-3 text-indigo-600 dark:text-indigo-400" />
                  <span>{msg.citation}</span>
                </div>
              )}
              <div className="text-[10px] text-zinc-400">{msg.timestamp}</div>
            </div>

            {msg.sender === "user" && (
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-zinc-200 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-300">
                <User className="h-4 w-4" />
              </div>
            )}
          </div>
        ))}

        {isTyping && (
          <div className="flex items-center gap-3">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-indigo-600 text-white">
              <Bot className="h-4 w-4" />
            </div>
            <div className="flex items-center gap-1.5 rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-xs text-zinc-500 dark:border-zinc-800 dark:bg-zinc-800">
              <span className="h-1.5 w-1.5 rounded-full bg-zinc-400 animate-bounce" />
              <span className="h-1.5 w-1.5 rounded-full bg-zinc-400 animate-bounce [animation-delay:0.2s]" />
              <span className="h-1.5 w-1.5 rounded-full bg-zinc-400 animate-bounce [animation-delay:0.4s]" />
            </div>
          </div>
        )}
      </div>

      {/* Message Input Box */}
      <form
        onSubmit={handleSend}
        className="flex items-center gap-2 border-t border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900"
      >
        <Input
          value={inputVal}
          onChange={(e) => setInputVal(e.target.value)}
          placeholder="Ask any question regarding leave, benefits, payroll or company policies..."
          className="h-10 text-xs"
        />
        <Button
          type="submit"
          size="sm"
          className="h-10 bg-indigo-600 text-white hover:bg-indigo-700 px-4"
        >
          <Send className="h-4 w-4 mr-1.5" />
          <span>Send</span>
        </Button>
      </form>
    </div>
  )
}
