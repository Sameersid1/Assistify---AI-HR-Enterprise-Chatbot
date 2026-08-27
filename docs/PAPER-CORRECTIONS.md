# Paper corrections

Everything below is checked against the code. Replace the marked passages in
`assistify.pdf` with the text given here.

**Why this is needed.** Section IV of the current draft describes a system that
does not exist: an MNB intent classifier, a STraVEns transformer ensemble,
OpenAssistant SFT-1 12B, MCDM-TOPSIS VM allocation, MUTABOT mutation testing,
HyDE, agentic branched RAG, MongoDB Atlas Vector Search, LangChain/LlamaIndex,
Kubernetes on EC2, and the EkhushBD dataset. None of the fifteen appears
anywhere in the repository. Section IV also contradicts Section V, which
reports real measurements from the real system — and a reader who catches that
will stop trusting the results, which are the strongest part of the paper.

Priority order: **§IV** (rewrite), **§III** (two of four problems), **Table III**
(wrong numbers), **Abstract/§I** (one sentence each), **Figures 1–3** (redraw).

---

## 1. Abstract — one sentence

**Find:**

> The LLM layer integrates Google Gemini 2.5 Flash through a tool-calling
> interface with a manually implemented invocation loop.

This sentence is in §I, not the abstract, but the abstract carries the same
assumption. No change is needed to the abstract text itself — it is
provider-neutral and accurate. Leave it.

---

## 2. Section I, Introduction — final paragraph of the system description

**Find:**

> Authentication uses JSON Web Tokens with Argon2id password hashing [1], [2].
> The LLM layer integrates Google Gemini 2.5 Flash through a tool-calling
> interface with a manually implemented invocation loop. The system is fully
> deployed and operational in production.

**Replace with:**

> Authentication uses JSON Web Tokens with Argon2id password hashing [1], [2].
> The LLM layer is provider-neutral: a single tool-calling loop is written
> against an internal interface, with thin adapters for two providers — Groq
> (`qwen/qwen3.6-27b`) as primary and Google Gemini (`gemini-2.5-flash`) as
> automatic fallback. The invocation loop is implemented directly rather than
> through an agent framework, which is what makes the tool-declaration boundary
> examined in this paper explicit and inspectable. The system is fully deployed
> and operational in production.

---

## 3. Section III, Problem Statement — replace P1 and P4

P2 and P3 are accurate; keep them unchanged. P1 and P4 describe problems this
system does not address — there is no intent classifier and no cloud resource
allocator — and both would invite questions with no answer.

**Delete P1 (Intent Classification Accuracy) and P4 (Cloud Resource
Optimization) entirely. Replace with:**

> *a) P1: Authorization Across Architectural Layers:* A layered web application
> enforces different security properties at different layers. Tenant isolation
> is typically enforced inside service functions, close to the data; role-based
> authorization is typically enforced in routing middleware, close to the
> request. This separation is invisible while every caller is an HTTP request.
> It becomes decisive the moment a language model is permitted to invoke service
> functions directly, because a tool invocation reaches the service layer without
> traversing the routing layer. Properties enforced below the entry point are
> inherited; properties enforced at it are lost, silently and without any
> compilation or test failure.
>
> *d) P4: Retrieval Under Heterogeneous Entitlement:* A single organization does
> not have a single rulebook. An intern, a contractor and a permanent employee
> may be governed by policies that contradict one another on the same question.
> A retrieval system that treats the corpus as uniform will rank a passage
> written for one class of employee against a question asked by another, and the
> language model has no basis for knowing the passage does not apply. Filtering
> must therefore be part of retrieval rather than a post-processing step, and it
> must be driven by an attribute the caller cannot influence.

**Table II — replace the P1 and P4 rows:**

| ID | Description | Impact |
|---|---|---|
| P1 | Authorization enforced in routing middleware is bypassed by tool invocations, which reach the service layer directly. | Silent privilege escalation |
| P4 | Uniform retrieval over a corpus containing entitlement-specific policies returns passages that do not apply to the asker. | Confidently incorrect answers |

---

## 4. Section IV — full replacement

Delete Section IV in its entirety and substitute the following. Subsection
letters A–H are preserved so cross-references elsewhere still resolve.

### IV. PROPOSED METHODOLOGY

Assistify is a conventional three-tier web application to which a tool-calling
language model has been added. The methodology below describes the system as
built; the design decisions that matter for the paper's argument are those at
the boundary between the application's service layer and the model.

#### A. System Architecture Overview

The system comprises three deployed tiers and one integration boundary.

- **Client** — a React 19 single-page application, served by Vercel. It holds
  no authorization logic of consequence: role-dependent rendering is a
  convenience, and every decision is re-made on the server.
- **API** — a Node.js/Express 4 REST service on Render, written in TypeScript,
  with Mongoose 8 as the data mapper. Request bodies are validated with Zod
  schemas at the route boundary.
- **Database** — MongoDB Atlas, shared-schema multi-tenant, six collections:
  `companies`, `users`, `leaveRequests`, `leaveBalances`, `documents` with
  `documentChunks`, `questions`, and `auditLogs`.
- **Assistant** — a tool-calling loop that invokes the same service functions
  the REST controllers call.

Four properties are enforced, each at a deliberate layer:

| Property | Enforced at | Inherited by tool calls? |
|---|---|---|
| Tenant isolation | Service layer (`scoped()` helper) | Yes, automatically |
| Resource ownership | Service layer | Yes, automatically |
| Role authorization | Route middleware (`requireRole`) | **No** — rebuilt at the tool boundary |
| Audience filtering | Database query predicate | Yes, by construction |

The third row is the paper's subject. The fourth is the generalisation of the
mitigation to retrieval.

#### B. Data Ingestion and Preprocessing

Policy documents are supplied as text. Extraction from binary formats is
performed in the browser, which keeps binary parsing and its failure modes out
of the API and means a policy pasted from an email follows exactly the same path
as one read from a file.

Ingestion has three stages.

1. **Chunking.** Text is split on paragraph boundaries into passages targeting
   1,200 characters, carrying 200 characters of overlap from the preceding
   passage. Overlap exists because a sentence answering a question may straddle
   a split; without it, that sentence belongs wholly to neither passage and
   ranks poorly in both. A single paragraph exceeding twice the target is
   hard-split.
2. **Embedding.** Each passage is embedded once at upload using
   `gemini-embedding-2` with `taskType: RETRIEVAL_DOCUMENT` and
   `outputDimensionality: 256`. These are Matryoshka embeddings: the leading
   dimensions carry the most signal, so truncation to 256 trades a small amount
   of accuracy for a quarter of the storage and a quarter of the arithmetic per
   comparison. Passages are embedded individually, five concurrently — a
   multi-text request to this model returns a single pooled vector rather than
   one vector per text.
3. **Storage.** Each chunk is written with its tenant identifier, its parent
   document, its position, its vector, and its audience labels. The audience is
   denormalised onto the chunk so that retrieval remains a single query; this is
   safe because documents have no update endpoint, only upload and delete.

#### C. Request Handling and Tool Construction

There is no intent classifier. Routing a natural-language question to an
operation is delegated to the language model itself, which selects from a list
of declared tools. What the system controls is not *which* tool the model
chooses but *which tools it is offered*.

The tool list is constructed on every request from the authenticated caller's
verified role:

```
buildTools(auth):
    tools ← selfServiceTools(auth)          # 8 tools, caller's own records
    if auth.role ∈ {hr, admin, super_admin}:
        tools ← tools ∪ approverTools(auth)  # 2 tools, company-wide
    return tools
```

An employee or IT-support account is offered eight tools; an approver is
offered ten. The two withheld tools — `list_company_leave_requests` and
`list_employees` — are not declared, not described, and not present in the
model's context in any form.

Each tool closes over the caller's `AuthContext`, so the service function it
invokes is scoped to the caller's tenant by the same helper the REST controllers
use. Arguments generated by the model are treated as untrusted input and parsed
through the identical Zod schema used by the corresponding HTTP endpoint.

#### D. Retrieval

Retrieval is dense-vector nearest-neighbour search computed in the application
layer. At the present corpus size — a few policy documents, on the order of
hundreds of passages — a linear scan is a microsecond-scale operation, and
avoiding a vector index keeps the system on managed database tiers with no
additional infrastructure to provision.

A query is embedded with `taskType: RETRIEVAL_QUERY` — deliberately a different
task type from the passages. A question and its answer are not paraphrases of
one another, and asymmetric embedding encodes that relationship rather than
treating retrieval as a similarity-of-surface-form problem.

Candidate passages are restricted **before ranking** by two predicates in the
same database query:

```
companyId = ⟨from verified token⟩
∧ ( audienceEmploymentTypes = ∅                    ▷ applies to everyone
  ∨ audienceEmploymentTypes ∋ ⟨caller's type⟩ )    ▷ applies to this caller
```

Placing the audience predicate in the query rather than applying it after
ranking is a correctness requirement, not an optimisation. Ranking first and
discarding afterwards would allow an inapplicable passage to occupy one of the
*k* returned slots, so the caller would receive *less* context rather than
*different* context — and the passage would have been loaded and compared
regardless, which is the cost the filter exists to avoid.

The surviving passages are ranked by cosine similarity and the top *k* = 4 above
a floor of 0.65 are returned. The derivation of that floor is reported in
Section V-D; it was measured rather than chosen.

#### E. Response Synthesis

The assistant runs a bounded tool loop. The model is given the tool list from
§IV-C, a system prompt, and the conversation. If it requests tools, they are
executed, their results appended to the transcript, and the model is asked
again. The loop terminates when the model returns text instead of a tool
request, or after four rounds — a ceiling that prevents a model which keeps
requesting tools from holding the request open indefinitely. Two rounds is the
deepest case these questions require.

The system prompt states the caller's identity — name, access level, employment
type, company — read from the database using the identifier in the verified
token, never from anything the client sent. It is declared as the sole authority
on identity, so a conversation that has been edited or carried over from another
session cannot change who the assistant believes it is serving.

A tool that throws does not fail the message: the error is returned to the model,
which can report it or try another approach. Answers are streamed to the client
over server-sent events, so text appears as it is produced.

#### F. Provider Abstraction and Failover

The assistant is not bound to one model vendor. A provider-neutral interface
defines the request, the message shapes and the streamed chunk; each provider
has a thin adapter translating to its own wire format. Groq is the primary
provider and Gemini the fallback.

The design constraint that matters is that **the tool loop is not duplicated**.
The loop is where role-scoped tool exposure is enforced, and a second
implementation is the mechanism by which a future correction reaches one path
and not the other. There is one loop; the security-critical module that builds
the tool list does not know which provider is running, and did not change when
the second was added.

Failover applies only until the first token reaches the client. After that the
answer is partly read, and restarting on a second provider would splice two
different answers together mid-sentence; a failure at that point is reported
rather than concealed. Statuses that every provider would reject identically
(400, 401) skip failover entirely.

#### G. Technology Stack and Evaluation Corpus

**Stack.** Client: React 19, TypeScript, Tailwind CSS, Radix UI primitives,
React Router 7. API: Node.js, Express 4, TypeScript, Mongoose 8, Zod, Argon2id,
`jsonwebtoken`, Helmet, CORS, `express-rate-limit`. Data: MongoDB Atlas.
Models: Groq `qwen/qwen3.6-27b`, Google `gemini-2.5-flash`, Google
`gemini-embedding-2`. Deployment: Vercel (client), Render (API), MongoDB Atlas.
Email: HTTPS transactional API, because outbound SMTP ports are blocked on the
API host.

No agent framework, orchestration library or vector database is used. The tool
loop, the retrieval ranking and the provider adapters are implemented directly.
This is a deliberate methodological choice: the paper's subject is the boundary
between an application's authorization model and a model's tool declarations,
and a framework that constructs that boundary on the author's behalf would
obscure exactly the thing being examined.

**Corpus.** Evaluation uses three policy documents totalling sixteen passages:
an employee handbook with no audience restriction, a full-time leave policy, and
an intern leave policy. The two leave policies contradict one another
deliberately — 18 annual days against 6 — which is what makes audience isolation
observable rather than merely asserted. There is no training set: no component
of this system is trained or fine-tuned, and reporting a train/validation/test
split would misrepresent the method.

#### H. Request Processing Pipeline

A single request proceeds as follows.

1. **Authenticate.** The access token is verified; `userId`, `companyId` and
   `role` are read from its verified claims.
2. **Rate-limit.** Applied per authenticated user, after authentication — a
   limiter placed before it counts by IP address and would penalise an entire
   office sharing one connection.
3. **Build tools.** The tool list is constructed from the caller's role (§IV-C).
4. **Describe caller.** Identity is read from the database and placed in the
   system prompt.
5. **Invoke.** The model is called through the provider abstraction (§IV-F).
6. **Execute tools.** Requested tools run under the caller's context, arguments
   validated by the route's own schema. Retrieval tools apply the tenancy and
   audience predicates of §IV-D.
7. **Repeat** from step 5 until the model returns text or four rounds elapse.
8. **Stream** the answer, and record any state-changing action in the audit
   trail.

Steps 1–3 occur before any part of the caller's message is read. This ordering
is the mechanism behind the paper's central claim: what the model may do is
fixed by the verified token before the prompt exists, so no phrasing of the
prompt can widen it.

---

## 5. Section V, Table III — corrected numbers

The "Assistant tools exposed" row is out of date.

**Find:** `Assistant tools exposed | 3 | 5 | 3 | 5`

**Replace with:** `Assistant tools exposed | 8 | 10 | 8 | 10`

Order is Employee, HR, IT, Admin. Employee and IT receive the eight
self-service tools; HR and Admin additionally receive
`list_company_leave_requests` and `list_employees`.

---

## 6. Figures 1–3 — redraw

All three depict the invented pipeline. Suggested replacements:

**Fig. 1 — System architecture.** Three tiers (React/Vercel → Express/Render →
MongoDB Atlas), with the assistant drawn as a *parallel entry point into the
service layer*, bypassing the route middleware box. Annotate the two paths:
"HTTP request → route guard → service" and "tool call → service". That single
diagram states the paper's finding better than any paragraph.

**Fig. 2 — Retrieval pipeline.** Upload → chunk (1,200 chars, 200 overlap) →
embed (256-dim, RETRIEVAL_DOCUMENT) → store with tenant and audience. Then:
question → embed (RETRIEVAL_QUERY) → **filter by tenant and audience** → rank by
cosine → floor at 0.65 → top 4. Draw the filter *before* the ranking box.

**Fig. 3 — Request pipeline.** The eight steps of §IV-H, with steps 1–3 grouped
and labelled "before the message is read".

---

## 7. What is already correct — do not change

Sections I, II, V, VI, VII and VIII are accurate and well-argued. Section V in
particular matches the measured data exactly. The Related Work positioning is
sound, and the honest limitation in §V-C — that fifteen author-written prompts
establish a lower bound rather than a proof — is the kind of statement that
earns credibility rather than costing it.

References [26]–[33] remain placeholders and still need real sources.

---

## 8. Optional additions

Four capabilities exist but are not described in the paper. None is required;
each is defensible if you want the contribution to look broader.

| Capability | Where it would go |
|---|---|
| Escalation to a human when retrieval fails, with consent | §IV-E, one paragraph; already measured in §V-F |
| Append-only audit trail of decisions, readable by administrators but not HR, who appear in it | §IV-A, one row in the properties table |
| Per-employment-type entitlement resolved through a single function shared by the allocator and the assistant's tool | §IV-D; this is what prevents the assistant quoting a figure that contradicts the balance it allocated |
| Password reset and rate limiting | §IV-G, one sentence — both are now implemented and §VI should not list them as future work |

---

## 9. Section V-G — the three missing experiments have now been run

Delete §V-G ("Measurements Still Required") entirely. Every `[AUTHOR: data
needed]` marker is now resolved. Substitute the three subsections below,
renumbering so they become **G, H and I**, with the Conclusion unchanged.

### G. Concurrency Safety of Balance Reservation

Leave reservation is a single conditional update: a `findOneAndUpdate` whose
filter asserts that the requested days do not exceed the available balance,
evaluated by the database rather than by the application. The experiment tests
whether simultaneous applications can over-allocate.

Twelve applications of two working days each were dispatched concurrently
against an allocation of ten days, using non-overlapping date ranges so that no
request could be refused for overlapping another. All twelve were issued in
parallel so that they contend inside the database rather than being serialised
by the client.

**TABLE VIII — CONCURRENCY UNDER SIMULTANEOUS APPLICATION**

| Metric | Result |
|---|---|
| Allocation | 10 days |
| Concurrent applications | 12 × 2 days |
| Theoretical maximum acceptances | 5 |
| Accepted | 5 |
| Rejected | 7 (all `LEAVE_INSUFFICIENT_BALANCE`) |
| Final reserved days | 10 of 10 |
| Available balance | 0 — never negative |

Exactly ⌊10/2⌋ = 5 requests succeeded. No request was rejected for any reason
other than insufficient balance, and the reserved total matched the accepted
count precisely, confirming that no partial or duplicated reservation occurred.

The result is a property of where the check is performed. A read-then-write
sequence — read the balance, decide, then write — admits a window in which two
requests both read a sufficient balance before either writes. Expressing the
condition inside the update statement eliminates the window entirely: the
second request matches no document and is refused. This is worth stating
because the same code written in the obvious order would pass every functional
test and fail only under contention.

### H. Latency

Latency was measured from the client, so each figure includes network transit,
framework overhead, validation, database access and, where applicable, model
inference. Median is reported alongside mean because a single cold start
distorts a mean of twenty far more than it distorts the experience being
described.

**TABLE IX — OPERATION LATENCY (ms)**

| Operation | n | Mean | Median | Range |
|---|---|---|---|---|
| Authentication (login) | 20 | 51 | 49 | 45 – 88 |
| Leave application | 20 | 8 | 8 | 6 – 13 |
| Assistant — no tool call | 10 | 1,671 | 1,429 | 990 – 2,494 |
| Assistant — one tool call | 10 | 2,916 | 2,656 | 2,328 – 4,337 |

Two observations follow. First, the application's own work is negligible: a
leave application — validation, an overlap query, an atomic conditional
reservation and a write — completes in single-digit milliseconds, and
authentication is dominated by the deliberate cost of Argon2id verification
rather than by the framework. Second, assistant latency is almost entirely
model time. The difference between the two assistant rows, approximately 1.2 s,
is the cost of the second model round trip that a tool-calling answer requires:
one call to select the tool, one to compose the answer from its result, with a
database query between them costing under ten milliseconds.

The practical consequence is that optimising this system for responsiveness
means reducing model round trips, not application code.

### I. Retrieval Quality

Twenty questions whose answers are present in the corpus, each labelled with
the document containing the answer, were issued alongside five whose answers
are absent. Queries were issued as a full-time employee, so the intern policy
was correctly out of scope and could not contribute to the score. Retrieval is
deterministic for a fixed corpus, so unlike generation these figures are
reproducible.

**TABLE X — RETRIEVAL QUALITY (k = 4, floor = 0.65)**

| Metric | Result |
|---|---|
| Recall@4 | 90.0% (18/20) |
| Mean reciprocal rank | 0.850 |
| Out-of-corpus rejection | 60.0% (3/5) |

An MRR of 0.850 indicates that where the correct document was retrieved it was
usually ranked first rather than merely present in the returned set.

The four errors are more informative than the aggregate, and all four are
attributable to the same cause — the similarity floor cutting through a
continuous distribution rather than a separable one.

Both retrieval misses returned *nothing at all* rather than a wrong passage:
the correct passage existed but scored below 0.65. Both false admissions
scored just above it, at 0.657 and 0.683. The floor is therefore not
separating relevant from irrelevant; it is separating scores, and near the
threshold the two populations overlap.

One pair makes this concrete. "How do I change my bank details?" returned
nothing, while "How do I reset my payroll direct deposit?" matched the handbook
at 0.657 — the same passage answers both, and the two phrasings fall on
opposite sides of the threshold. We further note that the second of these was
labelled out-of-corpus when the question set was written, but the handbook does
in fact cover changes to bank details; the retrieval was arguably correct and
the label wrong. Reported as measured, without adjusting the label after seeing
the result.

This qualifies the calibration reported in Section V-D rather than
contradicting it. Raising the floor from 0.5 to 0.65 converted a filter that
rejected nothing into one that rejects most off-topic queries, which is a
substantial improvement. It did not produce a clean separation, because at this
corpus size no single scalar threshold does. A threshold chosen on a small
corpus should be reported with its false-negative rate, not only its
false-positive rate — the recall cost is invisible if only rejection is
measured.
