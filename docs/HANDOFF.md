# Assistify — Project Handoff & Checkpoint

**Read this first. It takes 10 minutes and will save you a week.**

**Checkpoint date:** 2026-08-02
**Project:** Assistify – AI-Powered HR Assistant with Enterprise Knowledge Search
**Stage:** Architecture & scope locked (pending owner sign-off). **Zero code written. No repo initialised.**

---

## How to use this file

| You are… | Do this |
|---|---|
| A new team member | Read this file top to bottom, then read `SESSION-01-SCOPE-AND-TEAM-PLAN.md` in full, then find your role in §7 below |
| Returning after a break | Read §3 (decisions) and §5 (open questions) — that's what changed |
| An AI assistant being handed this project | Read this file, then the scope plan. §10 has your operating instructions. **Do not generate code.** |

This file is **context**. The scope plan is **specification**. If they ever disagree, the scope plan wins.

---

## 1. The project in 60 seconds

Employees waste HR's time asking the same questions — leave balance, WFH policy, holiday calendar, password resets. The answers already exist in company documents and databases; they're just not reachable in plain English.

Assistify is a chatbot that answers those questions by doing four things a generic chatbot cannot:

1. **Searches the company's own uploaded HR documents** (RAG) and cites the source
2. **Reads that specific employee's live data** from MongoDB — "you have 8 casual leaves left"
3. **Takes actions** — applies for leave, files a support ticket, with the user confirming first
4. **Enforces who can see what** — an employee cannot reach another employee's data, and Company A cannot reach Company B's documents

If it can't help, it offers to raise a ticket to HR or IT, attaches the chat transcript, and notifies the employee when staff update it.

**It is not** an HRMS. No payroll, no appraisals, no recruitment. Those are deliberately out of scope (§4).

---

## 2. Where we are right now

```
[✔] Idea captured
[✔] Scope critically reviewed and cut (~50% removed)
[✔] Architecture chosen and justified
[✔] Roles, collections, security model defined
[✔] 6-phase build plan with exit gates
[✔] 4-way team split assigned
[✔] Owner amendments applied (r3)
[ ] ◀── YOU ARE HERE: awaiting owner sign-off on 8 items (§5)
[ ] Full /docs set written (PROJECT_MEMORY, ARCHITECTURE, DATABASE_DESIGN, API_PLANNING, …)
[ ] Phase 0 — repo, schema freeze, API contract freeze
[ ] Phase 1 — build starts
```

**Nothing is committed. Nothing is built. This is intentional** — see §10.

---

## 3. Decision log — what's settled and why

**Do not reopen these without the owner.** The reasoning is recorded so nobody has to re-argue it.

| # | Decision | Verdict | Why |
|---|---|---|---|
| D1 | Overall scope | Cut roughly in half from the original brief | 4 people, one term. Wide-and-shallow scores badly; examiners probe one thing deeply |
| D2 | Multi-tenancy | **Yes — schema-level only.** `companyId` everywhere, 2 seeded companies | Costs one field + one middleware. Buys the best demo moment: same question, two companies, two correct cited answers. Full SaaS tenant signup/billing is *out* |
| D3 | Roles | **4** — `employee`, `hr`, `it_support`, `admin` | Each unlocks a permission no other has. `it_support` = cross-employee ticket access with *zero* HR data access — that contrast makes RBAC non-trivial |
| D4 | AI orchestration | **Tool calling**, not a hand-written intent classifier | Less code, better behaviour, far stronger viva answer. The model picks the tool; the backend controls the data |
| D5 | Identity handling | **No tool accepts an `employeeId` or `companyId` parameter** — both injected server-side from the JWT | ⭐ The single most important security property in the project. A compromised model still cannot reach another person's data. Everyone must be able to say this sentence |
| D6 | Vector store | **MongoDB Atlas Vector Search** | One database. Tenant filter + similarity search in the same query. Chroma/Qdrant/Pinecone add a service and earn nothing |
| D7 | Embeddings | Separate provider (Voyage AI or OpenAI `text-embedding-3-small`) | The Claude API has no embeddings endpoint. Don't go looking for one |
| D8 | Architecture | **Modular monolith** — React SPA + Express API | Microservices would cost weeks and lose marks for unjustified complexity |
| D9 | Backend language | **TypeScript**, not plain JS | Shared types with the frontend; the API contract stops drifting |
| D10 | Build order | **Chat is Phase 4 of 6** | Auth → HR modules → retrieval → chat. The tools must exist and be correct before the AI can call them. Building chat first over a fake backend is the classic failure |
| D11 | Phase 2 insurance | App must be **fully usable with no AI at all** by end of Phase 2 | If AI integration goes badly, you still have a working HR portal to demo |
| D12 | Ticket flow | AI attempts first → explicit 👍/👎 → if unhelpful, AI *recommends* → user confirms → ticket created | A ticket now means "the AI couldn't help" — which is what makes the deflection metric meaningful |
| D13 | "Was it solved?" | **Explicit user signal**, not AI self-assessment | Models are unreliable at judging their own success exactly when it matters. Also: this one control produces the analytics data. Build it once, get two features |
| D14 | Ticket contents | Chat transcript attached (`conversationId` on the ticket) | Staff see what was already tried. One field, highest perceived value in the demo |
| D15 | Notifications | **In-app only** (bell icon, 30s polling). Email deferred | Email = SMTP + provider + deliverability + spam folder + "let me check my inbox" dead air on demo day. WebSockets add bug surface for zero marks |
| D16 | Analytics | SHOULD-HAVE, **capped at 6 metrics**, headline = **AI deflection rate** | Turns "trust us it's useful" into "68% resolved without reaching HR". Cap exists because analytics is where teams lose a week to chart libraries |
| D17 | Policy comparison | **Documented future enhancement, not built** | It's not a RAG problem — it needs both documents in context at once plus structured diff output. Different pipeline, different evaluation |
| D18 | Write actions | Always require an explicit confirmation turn | An assistant that silently files tickets is a spam generator |
| D19 | Prompt injection defence | Capability restriction, not prompt wording | Uploaded docs are untrusted *data*. Even a fully compromised model has no tool that could leak another employee's record |

---

## 4. Rejected — do not re-propose

Someone will suggest these. The answer is already no.

| Idea | Why it's out |
|---|---|
| Payroll / payslips | Huge domain, no AI value, high sensitivity |
| Performance appraisals | An entire second product |
| Recruitment / ATS | An entire third product |
| Full offboarding & exit clearance | Long workflow, weak demo payoff |
| Biometric / device attendance | Hardware dependency |
| Org chart visualisation | Looks nice, teaches nothing |
| Shift scheduling / rosters | Complex, unrelated |
| Tenant signup, billing, subdomains | SaaS plumbing, not the project |
| **Fine-tuning a model** | Unnecessary and wrong here. RAG is the correct, defensible answer — be ready to say why |
| Voice interface | Demo risk, no marks |
| Separate mobile app | Responsive web is enough |
| WebSocket presence / typing indicators | Zero substance |
| Microservices | Weeks of cost, negative marks |
| `hr_manager` vs `hr_executive` as separate roles | No distinct permission — fails the role rule |
| Email notifications *in v1* | Deferred to NICE-TO-HAVE (D15) |

**The rule for anything new:** does it serve one of the five differentiators in §2 of the scope plan (identity-aware answers / actions / access control / tenant isolation / citations + audit)? If not, it's optional at best.

---

## 5. Open questions — blocking Phase 0

The owner must answer these 8 before the `/docs` set is written and building starts:

1. Approve the MUST / SHOULD / NICE / AVOID split
2. Confirm 4 roles including `it_support`
3. Confirm schema-level multi-tenancy
4. Confirm MongoDB Atlas Vector Search
5. Confirm the 4-way team split **— and pick one M4-overload fix** (see §6)
6. Confirm 12 weeks fits the academic calendar
7. Confirm in-app notifications now, email later
8. Confirm policy comparison stays a future enhancement

**Also undecided (raised, not yet answered):** whether to tighten the Phase 3 exit gate to require a written retrieval evaluation — ~20 questions scored for whether the correct chunk lands in top-k. Costs a day, gives you a real number to quote ("top-3 on 18/20"). Recommended if "enterprise knowledge search" stays in the title.

---

## 6. Known problems we already have

| Problem | Status |
|---|---|
| **M4 (frontend) is the bottleneck** — 4 UI surfaces for one person: employee dashboard, HR dashboard, IT dashboard, analytics page, plus chat and notifications | ⚠️ **Unresolved.** Pick one: (a) M1 co-owns frontend from Phase 4 — *recommended*, or (b) IT dashboard becomes a filtered view of the existing ticket table |
| **Phase 5 is overloaded** — ticket flow + notifications + analytics + acknowledgement in 2 weeks | Mitigation agreed: policy acknowledgement is the designated cut. Analytics and the ticket flow are not cuttable |
| RBAC must be tested **both directions** — IT blocked from HR data *and* HR blocked from the IT queue | One-directional testing is the classic bug here. In the Phase 1 exit gate |
| Deflection rate may look bad on demo day | Seed a realistic conversation mix deliberately; be ready to explain the number honestly rather than hide it |
| LLM API cost during development | Cache embeddings, cap chat length, use a mock LLM in dev |

---

## 7. Who does what

| Member | Owns |
|---|---|
| **M1 — Backend Core** | Auth, JWT, RBAC, tenancy middleware, users/companies, audit log, error handling, deployment. **Also owns the API contract doc and merges to `main`.** Likely co-owns frontend from Phase 4 |
| **M2 — HR Domain** | Leave + approval workflow, attendance, holidays, tickets + routing + escalation, notification service, analytics aggregations, policy acknowledgement |
| **M3 — AI / RAG** | Ingestion pipeline, chunking, embeddings, vector search, chat orchestrator, tool definitions + handlers, ticket-recommendation branch, prompt design, guardrails |
| **M4 — Frontend** | Entire React app — auth screens, chat UI with citations + 👍/👎, employee / HR / IT dashboards, analytics page, notification bell, all forms and tables |

Everyone: writes tests for their own module, and updates `PROJECT_MEMORY.md` when a decision changes.

---

## 8. The five things to memorise for the viva

1. **"No tool takes an `employeeId` parameter — identity comes from the verified JWT server-side."** Your strongest technical sentence.
2. **"Uploaded documents are untrusted data, not instructions. The real defence is capability restriction, not prompt wording."**
3. **"Company A gets 18, Company B gets 24 — same question, tenant-filtered retrieval, each citing its own document."**
4. **"X% of employee questions were resolved without ever reaching HR."** (the deflection rate)
5. **"We chose RAG over fine-tuning because policies change and answers must be traceable to a source document."**

---

## 9. File map

```
docs/
├── HANDOFF.md                        ← you are here (context + checkpoint)
└── SESSION-01-SCOPE-AND-TEAM-PLAN.md ← the specification. r3. Read it fully.
```

Not yet written (next deliverable, after sign-off):
`PROJECT_MEMORY.md` · `PROJECT_OVERVIEW.md` · `FEATURES.md` · `FUNCTIONAL_REQUIREMENTS.md` · `NON_FUNCTIONAL_REQUIREMENTS.md` · `USER_STORIES.md` · `SYSTEM_ARCHITECTURE.md` · `DATABASE_DESIGN.md` · `API_PLANNING.md` · `ROADMAP.md` · `TEAM_GUIDE.md` · `SECURITY.md` · `CHANGELOG.md` · `README.md`

---

## 10. Working agreement — how this project is run

1. **Documentation before code.** No scaffolding, no `npm create`, no repo init until the owner signs off §5. This is deliberate, not indecision — the schema and API contract get frozen in Phase 0, and freezing the wrong thing costs weeks.
2. **`PROJECT_MEMORY.md` will be the running record.** Once written, every decision change is amended there rather than silently dropped. A new developer should understand the whole project from that one file.
3. **Phase gates are mandatory.** A phase is not done until its exit gate demonstrably passes. Do not start the next phase early.
4. **Schema changes after Phase 0 require all-four sign-off.** Week-8 schema churn is the most common way a project like this dies.
5. **Challenge weak ideas, including mine.** The owner explicitly asked for disagreement over agreement. If a decision in §3 looks wrong, argue it with reasoning — don't quietly work around it.

### If you are an AI assistant picking this up

You are acting as **Senior Software Architect / Technical Lead / HR Domain Expert** on a final-year B.Tech project run by a 4-person team.

- **Do not generate code, scaffold a project, or run `npm`/`git init`** until the owner explicitly approves the scope.
- Your job is architecture, documentation, and honest pushback. Give **one recommendation with reasoning**, not a menu of options.
- Read `SESSION-01-SCOPE-AND-TEAM-PLAN.md` fully before answering anything substantive.
- When a requirement changes, **update the affected document sections** — don't just answer in chat and let the earlier decision rot.
- Classify every new feature idea against MUST / SHOULD / NICE / AVOID. Push back on anything that doesn't serve the five differentiators.
- Current model in the plan is `claude-opus-5` via tool calling; embeddings come from a separate provider (the Claude API has no embeddings endpoint).

**Suggested opening prompt when handing this over:**

> "Read `docs/HANDOFF.md` and `docs/SESSION-01-SCOPE-AND-TEAM-PLAN.md`. You are the Senior Software Architect on this project. Don't write any code. Confirm you understand the current checkpoint, then [your question]."

---

## 11. What happens next

1. Owner answers the 8 items in §5
2. Pick the M4-overload fix in §6
3. I write the full `/docs` set against the approved scope — `PROJECT_MEMORY.md` first
4. Phase 0 begins: repo, folder structure, docker-compose, **frozen schema**, **frozen API contract**
5. Only then does anyone write application code

---

*Checkpoint prepared with Claude (Opus 5) acting as Senior Software Architect / HR Domain Expert. Sessions covered: scope review, architecture selection, HR workflow design, team planning, and owner amendments r1→r3.*
