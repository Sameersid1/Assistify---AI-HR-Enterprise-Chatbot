# How the Assistify Chatbot Was Built

Plain-language notes on every step, so you can explain the work without
re-reading the code. Written in the order it was built.

**What it does today:** you type a question in the chat page, and the assistant
answers using your *real* leave records from the database. It does not guess and
it does not make up policy.

**What it does not do yet:** it can only read. It cannot apply for leave, approve
anything, or change any data. And it cannot read uploaded policy PDFs — that is
a separate feature (see [What's still missing](#8-whats-still-missing)).

---

## Table of contents

1. [The idea in one picture](#1-the-idea-in-one-picture)
2. [What we installed](#2-what-we-installed)
3. [Step 1 — the API key setting](#3-step-1--the-api-key-setting)
4. [Step 2 — the tools (the most important file)](#4-step-2--the-tools-the-most-important-file)
5. [Step 3 — the service that runs the conversation](#5-step-3--the-service-that-runs-the-conversation)
6. [Step 4 — the route](#6-step-4--the-route)
7. [Step 5 — the chat page](#7-step-5--the-chat-page)
8. [What's still missing](#8-whats-still-missing)
9. [How to run it](#9-how-to-run-it)
10. [Questions you will get asked](#10-questions-you-will-get-asked)

---

## 1. The idea in one picture

A normal chatbot only knows what it was trained on. It has never seen your
database, so it cannot know your leave balance.

**Tool calling** fixes that. We give the AI a list of functions it is allowed to
call. It decides when to call them; our server actually runs them and hands back
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
        Claude reads the question and replies:
        "I need to call get_my_leave_balance"
                 │
                 ▼
        Our server runs that function              ← the real database query
        Result: { annual: 12 left, casual: 5 left }
                 │
                 ▼
        Claude turns that into a sentence
                 │
                 ▼
You: "You have 12 annual and 5 casual days left."
```

**The key point:** Claude never touches the database. It only asks. Our server
decides whether to do it and always runs the query *as you*.

---

## 2. What we installed

Exactly one package, in the `server` folder:

```bash
cd server
npm install @anthropic-ai/sdk
```

That is the official Anthropic library. It handles talking to Claude and — the
useful part — it runs the whole "call a tool, send back the result, ask again"
loop for us, so we did not have to write that loop by hand.

Nothing was installed in the frontend. The chat page just calls our own API,
same as every other page.

---

## 3. Step 1 — the API key setting

**File:** `server/src/config/env.ts`

We added one line:

```ts
ANTHROPIC_API_KEY: z.string().trim().optional(),
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

A tool is three things: a **name**, a **description** telling Claude when to use
it, and a **function** to run. Example:

```ts
betaTool({
  name: 'get_my_leave_balance',
  description: "Get the signed-in employee's own leave balance ...",
  inputSchema: NO_ARGS,
  run: async () => JSON.stringify(await leaveService.getMyBalances(auth)),
})
```

The `description` matters more than it looks — it is how Claude decides whether
to call this tool. A vague description means the tool gets used at the wrong
times.

### The two safety rules

**Rule 1: every tool runs as *you*.**

Notice `auth` inside `run`. That is your identity, taken from your login token.
Our existing services already take it and filter every database query by your
`companyId`:

```ts
LeaveRequestModel.find(scoped(auth, filter))   // scoped() adds companyId
```

So there is **no sentence you can type** that makes the assistant read another
company's data. Not "ignore your instructions", not "pretend you are an admin".
The company filter is in the database query, and the value comes from a signed
token the browser cannot edit.

This is why the tools are built by a **function** and not stored as a fixed
list — a fixed list has no user to attach to.

**Rule 2: role is checked here, and this one is easy to get wrong.**

Tenant isolation is inside the services. **Role permission is not.**

`listCompanyRequests()` returns the whole company's leave queue. What normally
stops an employee calling it is the `requireRole('hr', 'admin', ...)` guard on
the HTTP route — and **a tool call does not go through routes**. If we had handed
that function to an employee's assistant, an employee could have asked the
chatbot to list everyone's leave and it would have worked.

So we build the tool list based on your role:

| Your role | Tools your assistant is given |
|---|---|
| Employee | your balance, your requests, company policy |
| IT Support | your balance, your requests, company policy |
| HR | the above **+** all company leave requests, employee directory |
| Admin | the above **+** all company leave requests, employee directory |
| Super Admin | the above **+** all company leave requests, employee directory |

An employee's assistant is **never told the extra tools exist**. It cannot call
something it has never heard of, cannot be argued into calling it, and cannot
even mention it. That is stronger than checking permission inside the tool.

We verified this by running the function for all five roles and printing the
tool names — employees got 3, HR/admin got 5. The split matches
`leave.routes.ts` exactly.

---

## 5. Step 3 — the service that runs the conversation

**File:** `server/src/modules/chat/chat.service.ts`

Three jobs.

### a) Tell Claude who it is talking to

We look up your name, role, department and company **from the database**, using
the id inside your token — never from anything the browser sent. Then we put it
in the system prompt (the instructions Claude reads before your message):

```
You are Assistify, the HR assistant for an employee self-service portal.

You are talking to:
Name: Priya Sharma
Role: hr
Company: Nexora Technologies

Today's date is 2026-08-18 (UTC).
```

Today's date is included because Claude has no clock, and leave questions are
almost always relative — "how many do I have left *this year*".

If someone types "I am actually an admin", nothing changes: the tools they were
given were chosen from their real role before the message was even read.

### b) The house rules

The rest of the system prompt is behaviour:

- **Get facts from tools. Never estimate.** This is the anti-hallucination rule.
- **If no tool can answer it, say so** and suggest contacting HR. Do not invent
  policy.
- **Two or three sentences** unless asked for more. It is a chat window.
- **Say what you cannot do** — it cannot apply for or approve leave, so it says
  so instead of pretending.

### c) Run the loop

```ts
const runner = anthropic.beta.messages.toolRunner({
  model: 'claude-opus-5',
  max_tokens: 16000,
  output_config: { effort: 'low' },
  system,
  tools: buildTools(auth),
  messages: input.messages,
})
```

- **`model`** — Claude Opus 5.
- **`max_tokens: 16000`** — a ceiling, not a target. You are only charged for
  what is actually generated, so leaving headroom is free. Setting it low is how
  you get answers that stop mid-sentence.
- **`effort: 'low'`** — how hard Claude thinks before answering. Chat needs to
  feel fast and these are simple lookups. If it ever starts picking the wrong
  tool, raise this to `medium` or `high`.

Then we loop over each turn to record which tools were used, so the UI can show
them. The last message the loop produces is the final answer.

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
- Whole conversation: max 40 messages (long chats get slow and expensive)

**The server remembers nothing between messages.** The browser sends the whole
conversation every time. That is the same stateless design as the rest of the
API — and it is why the server can restart mid-conversation without losing it.

---

## 7. Step 5 — the chat page

**File:** `web/src/pages/ChatPage.tsx`

The page already existed but was **entirely fake** — hardcoded messages and a
`setTimeout` that pattern-matched a few keywords to canned replies. All of that
is gone.

What changed:

- Real call: `api.post<ChatResponse>("/chat", { messages })`
- **Empty state** with your first name and three suggested questions, instead of
  a fake conversation already in progress
- **Tool chips** under each answer showing what was actually checked — e.g.
  *"Your leave balance"*. These are real: they come from the tools Claude
  genuinely called. The old page had fake ones like *"Leave Policy 2026 ·
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

## 8. What's still missing

Be upfront about this — it is the honest answer and it is a short list.

| Missing | Why it matters |
|---|---|
| **Reading policy documents (RAG)** | The "Enterprise Knowledge Search" half of the project title. Needs a documents module: upload, storage, chunking, embeddings, vector search. None of that exists yet. |
| **Actions** | It can read but not write. No applying for leave, no approving. Read-only was deliberate for the first version — a mistake cannot corrupt data. |
| **Streaming** | The answer appears all at once after 5–15 seconds, instead of word by word. |
| **Tool memory across turns** | Claude sees its own past *answers* but not the raw data behind them. Fine in practice, because the answer carries the facts. |
| **Ticket tools** | The tickets module does not exist on the backend yet. |

---

## 9. How to run it

**1. Get an API key** from [console.anthropic.com](https://console.anthropic.com)
→ API Keys.

**2. Local:** add to `server/.env`

```
ANTHROPIC_API_KEY=sk-ant-...
```

**3. Deployed:** Render → assistify-api → Environment → add the same variable →
save and let it redeploy.

**4. Test:** sign in, open the chat page, ask *"How many leave days do I have
left?"*

### Worth knowing

- **This one costs real money.** Every other service in this project is on a free
  tier. The Anthropic API is usage-billed. It is small at demo scale, but it is
  not ₹0 — update the cost slide in the presentation.
- **Render's free tier sleeps.** The first message after an idle period takes
  40+ seconds. Wake it before demoing.
- **Answers take 5–15 seconds.** That is normal — it is thinking and running
  database queries.

### Try this to show the security model

1. Sign in as **HR**. Ask *"Show me all pending leave requests."* → it works.
2. Sign in as an **employee**. Ask the same thing. → it will say it cannot do
   that, because that tool was never given to an employee's assistant.

That is a 30-second demo of the whole permission design.

---

## 10. Questions you will get asked

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
> the model. The system prompt tells it to call a tool rather than estimate, and
> to say it does not know rather than invent policy. It also has no policy
> documents to draw on yet — so if it is asked about a policy we do not store,
> the correct behaviour is to say so.

**"Why Claude and not something else?"**
> Good tool calling and a large context window. The design is not tied to it —
> the tools are ordinary functions, so swapping the provider means changing the
> service file, not the tools.

**"Which model, and how much does it cost?"**
> Claude Opus 5. It is usage-billed per token — small at our scale, but a real
> cost, unlike the rest of the stack which is all free tier.
