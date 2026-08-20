# How the Assistify Chatbot Was Built

Plain-language notes on every step, so you can explain the work without
re-reading the code. Written in the order it was built.

**What it does today:** you type a question in the chat page, and the assistant
answers using your *real* leave records from the database. It does not guess and
it does not make up policy.

**What it can also do now:** apply for leave and cancel a pending request on
your behalf, and answer policy questions from documents HR has uploaded, citing
the document it used.

**What it still cannot do:** approve or reject anyone else's leave — that stays
on the approvals page on purpose (see [What's still missing](#8-whats-still-missing)).

**Which AI:** Google Gemini (`gemini-2.5-flash`), because it has a genuinely
free tier — no card, no trial that expires.

---

## Table of contents

1. [The idea in one picture](#1-the-idea-in-one-picture)
2. [What we installed](#2-what-we-installed)
3. [Step 1 — the API key setting](#3-step-1--the-api-key-setting)
4. [Step 2 — the tools (the most important file)](#4-step-2--the-tools-the-most-important-file)
5. [Step 3 — the service that runs the conversation](#5-step-3--the-service-that-runs-the-conversation)
6. [Step 4 — the route](#6-step-4--the-route)
7. [Step 5 — the chat page](#7-step-5--the-chat-page)
8. [Step 6 — streaming the answer as it is written](#8-step-6--streaming-the-answer-as-it-is-written)
9. [What's still missing](#9-whats-still-missing)
10. [How to run it](#10-how-to-run-it)
11. [Two problems we hit and how we fixed them](#11-two-problems-we-hit-and-how-we-fixed-them)
12. [Questions you will get asked](#12-questions-you-will-get-asked)

---

## 1. The idea in one picture

A normal chatbot only knows what it was trained on. It has never seen your
database, so it cannot know your leave balance.

**Tool calling** fixes that. We give the AI a list of functions it is allowed to
ask for. It decides when to ask; our server actually runs them and hands back
the result.

```
You: "How many leave days do I have left?"
                 │
                 ▼
        Our server adds:
        - who you are (from your login token)
        - the list of tools you're allowed to use
                 │
                 ▼
        Gemini reads the question and replies:
        "I need you to run get_my_leave_balance"
                 │
                 ▼
        Our server runs that function              ← the real database query
        Result: { annual: 12 left, casual: 5 left }
                 │
                 ▼
        We send the result back to Gemini
                 │
                 ▼
        Gemini turns it into a sentence
                 │
                 ▼
You: "You have 12 annual and 5 casual days left."
```

**The key point:** Gemini never touches the database. It only asks. Our server
decides whether to do it, and always runs the query *as you*.

---

## 2. What we installed

Exactly one package, in the `server` folder:

```bash
cd server
npm install @google/genai
```

That is Google's official Gemini library. Unlike some other AI libraries, it
does **not** run the tool loop for us — so we wrote that loop ourselves in
`chat.service.ts`, about 30 lines. That turned out to be a good thing for a
project you have to explain: nothing is hidden inside a library.

Nothing was installed in the frontend. The chat page just calls our own API,
same as every other page.

---

## 3. Step 1 — the API key setting

**File:** `server/src/config/env.ts`

We added one line:

```ts
GEMINI_API_KEY: z.string().trim().optional(),
```

`.optional()` is deliberate. `MONGO_URI` and the JWT secrets are **required** —
without them the server refuses to start, because a server with no database is
broken. A missing AI key is different: everything else still works and only the
chat page is unavailable. So the server starts fine and only `/chat` says no.

That also means a teammate can clone the repo and run the whole app without
needing a key of their own.

The key goes in `server/.env` for local work and in the Render dashboard for the
deployed site. It is never committed — `.env` is in `.gitignore`.

---

## 4. Step 2 — the tools (the most important file)

**File:** `server/src/modules/chat/chat.tools.ts`

This is the file to talk about if someone asks how the chatbot works safely.

### What a tool is

A tool is two things: a **declaration** telling Gemini the name, what it does
and what arguments it takes; and the **function we run** when Gemini asks for it.

```ts
{
  declaration: {
    name: 'get_my_leave_balance',
    description: "Get the signed-in employee's own leave balance ...",
  },
  run: () => leaveService.getMyBalances(auth),
}
```

The `description` matters more than it looks — it is how Gemini decides whether
to use this tool at all. A vague description means the tool gets called at the
wrong times, or not at all.

### The three safety rules

**Rule 1: every tool runs as *you*.**

Notice `auth` inside `run`. That is your identity, taken from your login token.
Our existing services already take it and filter every database query by your
`companyId`:

```ts
LeaveRequestModel.find(scoped(auth, filter))   // scoped() adds companyId
```

So there is **no sentence you can type** that makes the assistant read another
company's data. Not "ignore your instructions", not "pretend you are an admin".
The company filter is applied inside the database query, and its value comes
from a signed token the browser cannot edit.

This is why the tools are built by a **function** and not stored as a fixed
list — a fixed list has no user to attach to.

**Rule 2: role has to be checked here, and this one is easy to get wrong.**

Tenant isolation is inside the services. **Role permission is not.**

`listCompanyRequests()` returns the whole company's leave queue. What normally
stops an employee calling it is the `requireRole('hr', 'admin', ...)` guard on
the HTTP route — and **a tool call does not go through routes**. If we had handed
that function to an employee's assistant, an employee could have asked the
chatbot to list everyone's leave and it would have worked.

So we build the tool list from your role:

| Your role | Tools your assistant is given |
|---|---|
| Employee | your balance, your requests, company policy, **search policy documents**, **apply for leave**, **cancel your request** |
| IT Support | same six as employee |
| HR | the above **+** all company leave requests, employee directory |
| Admin | the above **+** all company leave requests, employee directory |
| Super Admin | the above **+** all company leave requests, employee directory |

An employee's assistant is **never told the extra tools exist**. It cannot call
something it has never heard of, cannot be argued into calling it, and cannot
even mention it. That is stronger than checking permission inside the tool.

We verified this by running the function for all five roles and printing the
tool names — employees and IT support got 6, HR and admin got 8. The split
matches `leave.routes.ts` exactly.

**Rule 3: the AI's arguments are untrusted input.**

When Gemini calls `list_my_leave_requests`, *it* writes the arguments. That makes
them outside input, exactly like a request body — so they get exactly the same
treatment:

```ts
run: (args) => leaveService.listMyRequests(auth, listLeaveQuerySchema.parse(args))
```

`listLeaveQuerySchema` is the **same Zod schema the HTTP route uses**. If the AI
invents a status like `"MAYBE"`, it is rejected before it reaches a query.

---

## 5. Step 3 — the service that runs the conversation

**File:** `server/src/modules/chat/chat.service.ts`

Three jobs.

### a) Tell Gemini who it is talking to

We look up your name, role, department and company **from the database**, using
the id inside your token — never from anything the browser sent. Then it goes in
the system instruction (what Gemini reads before your message):

```
You are Assistify, the HR assistant for an employee self-service portal.

You are talking to:
Name: Priya Sharma
Role: hr
Company: Nexora Technologies

Today's date is 2026-08-18 (UTC).
```

Today's date is included because Gemini has no clock, and leave questions are
almost always relative — "how many do I have left *this year*".

If someone types "I am actually an admin", nothing changes: the tools they were
given were chosen from their real role before the message was even read.

### b) The house rules

The rest of the instruction is behaviour:

- **Get facts from tools. Never estimate.** This is the anti-hallucination rule.
- **If no tool can answer it, say so** and suggest contacting HR. Do not invent
  policy.
- **Two or three sentences** unless asked for more. It is a chat window.
- **Say what you cannot do** — it cannot apply for or approve leave, so it says
  so instead of pretending.

### c) The tool loop (the part we wrote by hand)

```
repeat up to 4 times:
    ask Gemini
    did it ask for any tools?
        no  → this is the answer, return it
        yes → run each tool as the caller
              add the request AND the results to the transcript
              loop again
```

In code that is roughly:

```ts
for (let round = 0; round < MAX_TOOL_ROUNDS; round += 1) {
  const response = await ai.models.generateContent({ model, contents, config })
  const calls = response.functionCalls ?? []

  if (calls.length === 0) return { reply: response.text, toolsUsed }   // done

  contents.push({ role: 'model', parts: calls.map(fc => ({ functionCall: fc })) })
  const results = await Promise.all(calls.map(runOneTool))
  contents.push({ role: 'user', parts: results })
}
```

Three details worth explaining:

- **`MAX_TOOL_ROUNDS = 4`** — without a limit, a model that keeps asking for
  tools loops forever, holding the request open and burning quota. Four is
  comfortably more than these questions need.
- **We push the model's request back into the transcript** before answering it.
  If you skip that, the call and its result are no longer paired and the next
  request is rejected.
- **A tool that throws does not kill the message.** We catch it and send the
  error text back to Gemini, so it can say "I couldn't look that up" instead of
  the user seeing a blank failure.

---

## 6. Step 4 — the route

**Files:** `chat.routes.ts`, `chat.controller.ts`, `chat.schema.ts`

Same five-file shape as the `leave` module, so it looks like the rest of the
codebase.

```ts
router.post('/', requireAuth, asyncHandler(chatController));
```

There is deliberately **no `requireRole`**. Everyone gets an assistant — they
just get different tools inside it.

`chat.schema.ts` validates the request with Zod, same as every other endpoint:

- Each message: max 4,000 characters (one giant paste can't blow up a request)
- Whole conversation: max 40 messages (long chats get slow and hit quota)

**The server remembers nothing between messages.** The browser sends the whole
conversation every time. That is the same stateless design as the rest of the
API — and it is why the server can restart mid-conversation without losing it.

---

## 7. Step 5 — the chat page

**File:** `web/src/pages/ChatPage.tsx`

The page already existed but was **entirely fake** — hardcoded messages and a
`setTimeout` that matched a few keywords to canned replies. All of that is gone.

What changed:

- Real call: `api.post<ChatResponse>("/chat", { messages })`
- **Empty state** with your first name and three suggested questions, instead of
  a fake conversation already in progress
- **Tool chips** under each answer showing what was actually checked — e.g.
  *"Your leave balance"*. These are real: they come from the tools Gemini
  genuinely asked for. The old page had fake ones like *"Leave Policy 2026 ·
  Section 4.2"* pointing at a document that does not exist.
- Input disabled while thinking, so you cannot send two questions at once
- Auto-scroll to the newest message
- Errors shown in the page; if the server has no API key you get *"The assistant
  isn't switched on for this server yet"* rather than a generic failure
- **Removed two false claims** from the header: *"Grounded in 28 verified Nexora
  internal policies"* (there are zero policy documents in the system) and
  *"Model: Assistify v4.2"* (not a real model name)

### One subtle bug avoided

When you send a message we build the transcript from a **snapshot**, not from
component state:

```ts
const transcript = [...messages.map(...), { role: "user", content: question }]
setMessages((prev) => [...prev, userTurn])
```

React state updates are not instant. Reading `messages` after `setMessages`
would send the conversation *without* the question just typed.

---

## 8. Step 6 — streaming the answer as it is written

At first the chat sat silent for three or four seconds and then dropped the
whole answer in at once. It worked, but it felt broken — you could not tell
whether it was thinking or had crashed. Now the words appear as Gemini writes
them, the way ChatGPT does.

### The idea

Normally a web request is one question and one answer: you ask, you wait, you
get everything. Streaming keeps the connection open and sends the answer in
small pieces as it is produced.

The technique is called **SSE — Server-Sent Events**. The server holds the
response open and writes lines like this, one at a time:

```
data: {"type":"tool","name":"get_my_leave_balance"}

data: {"type":"delta","text":"Arjun,"}

data: {"type":"delta","text":" you have 3 casual leave days left."}

data: {"type":"done","toolsUsed":["get_my_leave_balance"]}
```

The browser reads them as they arrive and adds each `delta` to the reply
bubble. Five kinds of message travel down this pipe:

| Event | Meaning |
|---|---|
| `tool` | A tool was just called — the chip appears immediately, before any text |
| `delta` | A piece of the answer, appended to what is already on screen |
| `discard` | Throw away the text so far and start the bubble again (explained below) |
| `done` | The answer is finished, with the final list of tools used |
| `error` | Something failed — shown as a message instead of a dead, silent stream |

### What we added

- `chatStream()` in `chat.service.ts` — the same loop as before, but using
  `generateContentStream` and reporting each piece as it arrives.
- `chatStreamController` in `chat.controller.ts` — holds the connection open
  and writes the events.
- `POST /api/v1/chat/stream` — the new route. The old `POST /api/v1/chat` still
  works and still returns the whole answer at once.
- `api.stream()` in `web/src/lib/api.ts` — reads the pieces in the browser.
- A **Stop** button, which replaces Send while an answer is being written.

**The important part for your viva:** the streaming path shares `prepare()` and
`resolveCalls()` with the old one. It builds the tool list from the same
`buildTools(auth)` and uses the same system prompt. If streaming had its own
copy of that code, someone could later fix a permission bug in one path and not
the other. Same security, one implementation, two ways of delivering it.

### Why `discard` exists

Occasionally the model says something like "Let me check that for you…" and
*then* calls a tool. That sentence is it thinking out loud, not the answer. If
we left it on screen the reader would end up with two answers stuck together.
So when a round ends in a tool call, the server sends `discard`, the browser
empties the bubble, and the real answer starts clean.

### Three bugs we hit building this

**1. Every stream aborted instantly and returned nothing.**
We wanted to stop generating if the user closed the tab, so we listened for the
connection closing:

```ts
req.on('close', () => controller.abort());   // WRONG
```

`req` is the *incoming* request. By the time our code runs, Express has already
finished reading the request body — so `req` fires `close` immediately, every
single time. Every answer cancelled itself before producing a word. The fix is
to watch the *outgoing* response instead, which closes only when the browser
really goes away:

```ts
res.on('close', () => controller.abort());   // RIGHT
```

**2. Reloading the page wiped the conversation.**
The transcript is saved to `localStorage`. Two pieces of code run when the page
loads: one *loads* the saved messages, one *saves* the current messages. On a
reload the saving code sometimes ran first, while the list was still empty, and
wrote an empty list over the real conversation. Now saving refuses to overwrite
a saved conversation with an empty one.

**3. Pressing Stop broke the next question.**
Stopping before any text arrived left an empty message bubble. That empty
message was then sent with the next question, and the server rejects empty
messages — so the following question failed with a `400` error. Now empty
bubbles are removed and never sent.

### How to demonstrate it

Ask something that needs a tool, like *"How many casual leave days do I have
left?"* Watch the order: the grey **Your leave balance** chip appears first,
proving the assistant looked the number up, and only then does the sentence
type itself out. Ask a long question and press **Stop** halfway — the words
written so far stay on screen and you can carry on asking.

---

## 9. What's still missing

Be upfront about this — it is the honest answer and it is a short list.

| Missing | Why it matters |
|---|---|
| **Approving via chat** | Deliberate, not missing. Deciding someone else's leave changes their balance and is recorded against you, so it belongs on the approvals page where the request is on screen. Applying and cancelling your own leave is reversible, which is why those are allowed. |
| **PDF parsing on the server** | Text is extracted in the browser, which reads .txt/.md/.csv natively. For a PDF you open it, copy the text and paste it in. |
| **Retrieval quality measurement** | Search works but we have not measured how often it finds the right passage. |
| **Tool memory across turns** | Gemini sees its own past *answers* but not the raw data behind them. Fine in practice, because the answer carries the facts. |
| **Ticket tools** | The tickets module does not exist on the backend yet. |

---

## 10. How to run it

**1. Get a free API key** from
[aistudio.google.com/apikey](https://aistudio.google.com/apikey). Sign in with a
Google account, click *Create API key*. **No card required.**

**2. Local:** add to `server/.env`

```
GEMINI_API_KEY=AIza...
```

Then **restart the server** — `.env` is only read at boot.

**3. Deployed:** Render → assistify-api → Environment → add the same variable →
save and let it redeploy.

You need it in **both** if you want chat working locally and on the deployed
site — they are separate servers.

**4. Test:** sign in, open the chat page, ask *"How many leave days do I have
left?"*

### Worth knowing

- **Free tier has rate limits** — a limited number of requests per minute and
  per day. Fine for a demo; you may hit it if you sit and hammer it for an hour.
  If that happens you will get an error, not a charge.
- **Render's free tier sleeps.** The first message after an idle period takes
  40+ seconds. Wake it before demoing.
- **Answers take a few seconds.** That is normal — it is thinking and running
  database queries.

### Try this to show the security model

1. Sign in as **HR**. Ask *"Show me all pending leave requests."* → it works.
2. Sign in as an **employee**. Ask the same thing. → it replies that it cannot,
   because that tool was never given to an employee's assistant.

That is a 30-second demo of the whole permission design. Note the difference:
a **red error banner** means something failed; a **chat bubble** means the
assistant answered. The employee case should be a chat bubble.

---

## 11. Two problems we hit and how we fixed them

Worth knowing, because they are the kind of thing an examiner may ask about.

### Problem 1: the AI library would not import

Our backend is compiled as **CommonJS** (the older `require` style). The Gemini
library ships as **ESM** (the newer `import` style). TypeScript refused to build:

```
error TS1479: The current file is a CommonJS module whose imports will produce
'require' calls; however, the referenced file is an ECMAScript module.
```

We did not want to convert the whole backend to ESM for one feature. The fix
was two changes:

- Import only the **types** at the top of the file
  (`import type { ... } from '@google/genai' with { 'resolution-mode': 'import' }`).
  Types disappear at build time, so nothing tries to load the library there.
- Load the actual class with a **dynamic import** at the point it is used:
  `const genai = await import('@google/genai')`. CommonJS is allowed to do that.

We verified the compiled output still contains `await import(...)` and not
`require(...)`, and ran it to confirm the library loads.

### Problem 2: role permissions do not come for free

Described in [Rule 2](#4-step-2--the-tools-the-most-important-file) above. Worth
repeating because it is the most interesting thing we found: our **tenant**
isolation lives inside the services, so tools inherit it automatically — but our
**role** checks live on the HTTP routes, and tool calls never touch routes.
Handing a route-protected function to the AI would have quietly bypassed our own
permission system. That is why the tool list is built per user.

---

## 12. Questions you will get asked

**"Is the AI connected to your database?"**
> Not directly. It can request specific functions we wrote, and our server runs
> them. It never gets a database connection, and it can only request the
> functions we handed it for that particular user.

**"What stops someone asking it for another company's data?"**
> The company ID comes from their signed login token, and every database query
> is filtered by it. The AI has no say in that value — it is applied inside the
> function, after the AI has already asked.

**"What if someone tells it to ignore its instructions?"**
> That is prompt injection, and it is a real attack. Our answer is that the AI
> has nothing extra to give away. The tools it holds were chosen from the user's
> role before the message was read, and each one filters by that same user. The
> worst a successful injection achieves is making the assistant call a tool the
> person could already have used by clicking a button.

**"Can it make things up?"**
> It can phrase things badly, but the numbers come from tool results, not from
> the model. The system instruction tells it to call a tool rather than
> estimate, and to say it does not know rather than invent policy. It also has
> no policy documents to draw on yet — so if it is asked about a policy we do
> not store, the correct behaviour is to say so.

**"Why Gemini?"**
> A real free tier, and good function calling. The design is not tied to it —
> the tools are ordinary functions of ours, so switching provider means
> rewriting one file (`chat.service.ts`), not the tools or the security model.

**"What does it cost?"**
> Nothing. Gemini's free tier covers this comfortably at demo scale. There are
> per-minute and per-day request limits rather than a bill.

**"Why did you write the tool loop yourself?"**
> The Gemini library does not provide one. It is about 30 lines: ask, check
> whether it requested tools, run them, send the results back, repeat — with a
> hard limit of four rounds so it cannot loop forever.
