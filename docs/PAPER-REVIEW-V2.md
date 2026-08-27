# Review of the rewritten draft

Checked against the code. Ordered by how much damage each would do if left in.

---

## CRITICAL — fix before anyone else reads it

### 1. The IEEE template placeholder is still in the paper

> `Keywords—component, formatting, style, styling, insert (key words)`

That is the sample text shipped with the IEEE template. Replace with:

> *Keywords*—multi-tenant architecture, role-based access control, large
> language models, tool calling, retrieval-augmented generation, prompt
> injection, human resource management systems, web application security

### 2. Tool counts are wrong (Section VI-B)

> "Employee and IT Support users get six tools. HR, Admin and Super Admin users
> get eight tools."

Measured from `buildTools()`: **8 and 10**.

> Employee and IT Support accounts receive eight tools, all operating on the
> caller's own records. HR, Admin and Super Admin accounts receive ten — the
> same eight plus `list_company_leave_requests` and `list_employees`, which read
> across the whole organization.

### 3. Two sections are numbered VI

"VI. LLM INTEGRATION AND ROLE-SCOPED TOOLS" and "VI. IMPLEMENTATION".
Implementation should be **VII**.

### 4. Table I is empty

Only a header and blank rows. Either fill it or delete it — an empty table is
worse than no table. Suggested content:

| Work / Area | Multi-tenancy | RBAC-aware | LLM tool calling | Authorization preserved under tool calls |
|---|---|---|---|---|
| HR self-service chatbots | No | No | No | n/a |
| Multi-tenant SaaS isolation | Yes | Partial | No | n/a |
| LLM tool calling / function calling | No | No | Yes | Not addressed |
| Prompt-injection defences | No | No | Yes | Partial |
| **Assistify (this work)** | Yes | Yes | Yes | Yes |

Each row needs a citation once you have references [26]-[33].

---

## FACTUAL — wrong against the code

### 5. Gemini described as the only provider (two places)

Section IV: *"The back end talks to the Gemini API to run LLM-based tool calls."*

Section VII: *"The application includes large language model features through the Gemini API."*

Groq is primary; Gemini is the automatic fallback. Replace both with:

> The backend reaches language models through a provider-neutral interface, with
> Groq (`qwen/qwen3.6-27b`) as the primary provider and Google Gemini
> (`gemini-2.5-flash`) as an automatic fallback. A single tool-calling loop is
> written against that interface, so the module constructing the role-scoped
> tool list is independent of which provider serves a request. Document
> embeddings use `gemini-embedding-2`.

Worth stating rather than hiding: one loop shared by both providers is what
prevents a future correction to the authorization logic reaching one path and
not the other.

### 6. Collection list is incomplete (Section VII)

> "companies, users, leave balances leave requests, documents and document chunks"

Eight collections exist. Replace with:

> The database holds eight collections: `companies`, `users`, `leaveBalances`,
> `leaveRequests`, `documents`, `documentChunks`, `questions` and `auditLogs`.
> Tenant-scoped data carries a `companyId` field, and compound indexes lead with
> that field so tenant-scoped queries are served efficiently.

### 7. Module list is incomplete (Sections IV-A and VII)

> "authentication, users, companies leave, chat, documents and health"

Nine modules exist:

> authentication, users, companies, leave, chat, documents, questions, audit and
> health.

---

## MISSING — built, evaluated, and not mentioned

Four capabilities exist and appear nowhere in the paper.

### 8. Add to Section V (Security Design) as a new subsection

> **F. Request Limiting and Auditability**
>
> Two operational controls complete the security design. Request limits are
> applied per authenticated user rather than per network address — the limiter
> executes after authentication, since one placed before it can only count by
> address and would penalise an entire organization sharing a single connection.
> Separate limits protect the assistant, whose every message consumes shared
> model quota, and the authentication endpoints, where password guessing would
> otherwise be unconstrained.
>
> Every action that alters a person's record — a leave decision, an account
> invitation or deactivation, a policy publication, an answered question — is
> written to an append-only audit collection recording the actor, the subject
> and the time. Actor names are copied into the entry rather than joined at read
> time, so the record does not change retroactively when a profile is edited.
> The trail is readable by administrators and deliberately not by HR, who appear
> in it: the subject of a record should not control what it says.

### 9. Add to Section VI (LLM Integration) as a new subsection

> **F. Escalation to a Human**
>
> A retrieval system that correctly declines to answer still leaves the asker
> without an answer and the organization unaware of the gap. The assistant may
> therefore forward an unanswerable question to HR, but only after the user
> explicitly agrees in the conversation. The record carries the question, the
> asker, and the assistant's own stated reason for failing, so that the human
> addresses the gap rather than repeating a refusal the user has already read.
> HR replies within the application, the asker is notified, and a further tool
> allows the assistant to read the answer back on request.
>
> The reply is deliberately not injected into the conversation transcript, which
> is held client-side and is not retained by the server. It is stored as its own
> record and reached through a tool, preserving the property that every fact the
> assistant states originates from a tool call rather than from conversational
> memory.

### 10. Add retrieval parameters to Section VI

The current text says documents are chunked and embedded without giving any
figures, which invites the question in a viva.

> Documents are segmented on paragraph boundaries into passages targeting 1,200
> characters with 200 characters of overlap, embedded once at upload with
> `taskType: RETRIEVAL_DOCUMENT` at 256 dimensions. A question is embedded with
> `taskType: RETRIEVAL_QUERY` — deliberately a different task type, since a
> question and the passage answering it are not paraphrases of one another.
> Candidate passages are restricted by tenant and audience predicates inside the
> database query, then ranked by cosine similarity, with the four highest
> scoring above a floor of 0.65 returned.

---

## STYLE — a reviewer will notice these

### 11. First-person observations read as generated filler

Four instances:

- *"I find the backend organized using feature-based slices."*
- *"I notice how Assistify applies security at layers..."*
- *"I have observed how Assistify enforces authorization..."*
- *"I find this approach very clear."*

An author does not *observe* their own system; they built it. Replace with
impersonal statements — "The backend is organized...", "Assistify applies
security in layers...", "Assistify enforces authorization by withholding
capabilities..." — and delete the fourth entirely.

### 12. Sentences needing repair

| Current | Suggested |
|---|---|
| "In resources a model like this can help workers" | "In human resources, such a model can help employees" (appears twice) |
| "Than giving the model direct access to the database" | "Rather than giving the model direct access to the database" |
| "uses a controlled tool-calling approach of giving free access" | "uses a controlled tool-calling approach rather than giving free access" |
| "Assistify limits how times the model can call a tool" | "Assistify limits how many times the model can call a tool" |
| "This is a deal in systems that serve many different companies" | "This is a particular problem in systems serving many organizations" |
| "It uses rules that depend on the users job. What company they belong to." | "It applies rules depending on the user's role and the organization they belong to." |
| "Users authenticate through the application. Receive a signed JSON Web Token" | "Users authenticate through the application and receive a signed JSON Web Token" |
| "The system is shown as a way to build apps and protect them not as a way to make models" | "The system is presented as an application architecture and security contribution rather than a modelling one" |

Several paragraphs split a single idea across two sentences with a full stop
mid-clause. Worth one read-through aloud before submitting.

### 13. The abstract states no results

It describes the mechanism but reports no findings. Two sentences would
strengthen it considerably:

> Tool selection was correct on 17 of 18 evaluation prompts. Across fifteen
> adversarial prompts issued as an ordinary employee — including instruction
> overrides, false role assertions, and a direct request for a withheld function
> by name — no privilege escalation occurred, and no out-of-corpus question
> produced a fabricated answer.

---

## WHAT IS GOOD — keep as written

The structure is a clear improvement on the previous draft. Separating Security
Design from LLM Integration is the right decision: it lets the paper state the
layering argument once, then apply it.

Section V-E, *Capability Withholding*, is the strongest paragraph in the paper.
The sentence — *"the withheld capability is not in the model context and cannot
be chosen directly by prompt manipulation"* — is the contribution in one line.

Section VI-C correctly identifies that tenant isolation survives because it
lives in the service layer while role authorization does not. That distinction
is the paper's finding, stated accurately.

Every invented component from the previous draft is gone. Nothing in this draft
describes a system that does not exist.
