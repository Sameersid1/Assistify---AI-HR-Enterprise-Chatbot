import React from "react"

/**
 * The small amount of Markdown a chat reply actually contains.
 *
 * The assistant writes `**Employee Handbook**` and bulleted lists whether or
 * not anyone asked it to — that is simply how these models write prose. Until
 * this existed the chat rendered its replies as plain text, so people read
 * literal asterisks around every document title the assistant cited.
 *
 * WHY NOT A MARKDOWN LIBRARY
 * The full grammar is not needed and carries a real risk. Replies contain text
 * the user themselves typed a moment earlier, so a renderer that produces raw
 * HTML turns the chat into a cross-site-scripting surface — one person's
 * question, echoed back through the model, becomes markup in their own page.
 * This returns React elements instead. React escapes text nodes, so there is
 * no path from a reply to executable markup, whatever the model emits.
 *
 * Deliberately partial: bold, italic, inline code, bullets, numbered lists and
 * small headings. Tables, images and links are not produced by these answers,
 * and guessing at them would mean parsing far more than is needed.
 */

/** Splits a line into runs, keeping the delimiters so each run can be typed. */
const INLINE = /(\*\*[^*]+\*\*|__[^_]+__|\*[^*\n]+\*|_[^_\n]+_|`[^`]+`)/g

function renderInline(text: string, keyPrefix: string): React.ReactNode[] {
  return text.split(INLINE).filter(Boolean).map((part, i) => {
    const key = `${keyPrefix}-${i}`

    if (part.startsWith("**") && part.endsWith("**") && part.length > 4) {
      return <strong key={key} className="font-semibold">{part.slice(2, -2)}</strong>
    }
    if (part.startsWith("__") && part.endsWith("__") && part.length > 4) {
      return <strong key={key} className="font-semibold">{part.slice(2, -2)}</strong>
    }
    if (part.startsWith("`") && part.endsWith("`") && part.length > 2) {
      return (
        <code
          key={key}
          className="rounded-xs bg-zinc-200/70 px-1 py-px font-mono text-[0.95em] dark:bg-zinc-700/60"
        >
          {part.slice(1, -1)}
        </code>
      )
    }
    if (
      ((part.startsWith("*") && part.endsWith("*")) ||
        (part.startsWith("_") && part.endsWith("_"))) &&
      part.length > 2
    ) {
      return <em key={key}>{part.slice(1, -1)}</em>
    }
    return <React.Fragment key={key}>{part}</React.Fragment>
  })
}

const BULLET = /^\s*[-*•]\s+(.*)$/
const NUMBERED = /^\s*(\d+)[.)]\s+(.*)$/
const HEADING = /^\s*(#{1,4})\s+(.*)$/

/**
 * Render one assistant reply.
 *
 * Consecutive list lines are gathered into a single list so the browser spaces
 * them as one block; a run of ordinary lines becomes a paragraph. Blank lines
 * separate blocks, which is the only structural rule these replies rely on.
 */
export function renderMarkdown(source: string): React.ReactNode {
  const lines = source.split("\n")
  const blocks: React.ReactNode[] = []

  let paragraph: string[] = []
  let list: { ordered: boolean; items: string[] } | null = null

  const flushParagraph = () => {
    if (paragraph.length === 0) return
    const text = paragraph.join("\n")
    blocks.push(
      <p key={`p-${blocks.length}`} className="whitespace-pre-wrap">
        {renderInline(text, `p${blocks.length}`)}
      </p>,
    )
    paragraph = []
  }

  const flushList = () => {
    if (!list) return
    const { ordered, items } = list
    const key = `l-${blocks.length}`
    const children = items.map((item, i) => (
      <li key={`${key}-${i}`}>{renderInline(item, `${key}-${i}`)}</li>
    ))
    blocks.push(
      ordered ? (
        <ol key={key} className="list-decimal space-y-0.5 pl-5">{children}</ol>
      ) : (
        <ul key={key} className="list-disc space-y-0.5 pl-5">{children}</ul>
      ),
    )
    list = null
  }

  for (const line of lines) {
    if (!line.trim()) {
      flushParagraph()
      flushList()
      continue
    }

    const heading = HEADING.exec(line)
    if (heading) {
      flushParagraph()
      flushList()
      blocks.push(
        <p key={`h-${blocks.length}`} className="font-semibold">
          {renderInline(heading[2], `h${blocks.length}`)}
        </p>,
      )
      continue
    }

    const bullet = BULLET.exec(line)
    if (bullet) {
      flushParagraph()
      if (!list || list.ordered) {
        flushList()
        list = { ordered: false, items: [] }
      }
      list.items.push(bullet[1])
      continue
    }

    const numbered = NUMBERED.exec(line)
    if (numbered) {
      flushParagraph()
      if (!list || !list.ordered) {
        flushList()
        list = { ordered: true, items: [] }
      }
      list.items.push(numbered[2])
      continue
    }

    // An ordinary line while a list is open continues that list item, which is
    // how a wrapped bullet arrives.
    if (list && list.items.length > 0) {
      list.items[list.items.length - 1] += ` ${line.trim()}`
      continue
    }

    paragraph.push(line)
  }

  flushParagraph()
  flushList()

  return <div className="space-y-2">{blocks}</div>
}
